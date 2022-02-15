import { binarySearchLowerLimit } from './binarySearchLowerLimit'
import { blockTextString, getFunctionName } from './blockTextString'
import { safeRegexCreator } from './regexCreator'
import { getExeFileName } from './trace'

interface DrawData {
  xCoordinate: number
  yCoordinate: number
  Height: number
  LayerNumber: number
}

// Imported from prodfiler_ui/src/services/flamegraph.ts
export interface BackendFlamegraph {
  ExeFileName: string
  FileID?: string
  FunctionID: string
  FunctionName: string
  FunctionSourceID: string
  SourceLine: number
  FunctionSourceURL: string
  FunctionSourceLine: number
  SourceFilename: string
  FrameType?: number
  AddressOrLine?: number
  Samples: number
  Callees: BackendFlamegraph[]
  Rectangle?: DrawData
  TotalTraces?: number
  TotalSeconds?: number
}

export interface DrawableBlock {
  ExeFileName: string
  FunctionID: string
  FunctionName: string
  // used to improve the performance of the search, so that we don't calculate on the fly
  computedDisplayName: string
  FunctionSourceID: string
  SourceLine: number
  FunctionSourceURL: string
  FunctionSourceLine: number
  FrameType: number
  SourceFilename: string
  AdressOrLine: number
  FileID: string
  Samples: number
  Callees: BackendFlamegraph[]
  Rectangle: DrawData
  // duplicate from PerBlockEstimates so that we can show it on the text inside each block without constant recalculation
  PercentageEstimate: number
  OriginalFlamegraphNode: BackendFlamegraph
}

// VisibleView describes the rectangle into the larger chart that should be drawn
export interface VisibleView {
  // The x-Coordinate of the lower left corner of the visible rectangle
  xCoordinate: number

  // The y-Coordinate of the lower left corner of the visible rectangle
  yCoordinate: number

  /**
   * Height of the visible rectangle. This is expressed in an integer
   * where height / FlamechartDataContainer.blockHeightInPixels determines the number of visible
   * frames. Example: 3000 corresponds to 3000 / 30 = 100 visible frames
   */
  height: number

  // Width of the visible rectangle. This is expressed as "number of samples
  width: number

  // The resolution of the canvas on which things will be drawn
  xResolution: number
  yResolution: number
}

/**
 * In order to convert the tree-like structure of the diagram into rectangles and in order to
 * perform the layout, RecursiveDrawLayer is used to keep state in the worklist algorithm below.
 */
interface RecursiveDrawLayer {
  readonly layerNum: number
  readonly startX: number
  data: BackendFlamegraph
}

/**
 * A pretty standard worklist algorithm to run through the flamegraph JSON and assign diagram
 * rectangles and their positions to the individual nodes.
 */
const backendflamechartToDrawable = (
  indata: BackendFlamegraph
): Array<DrawableBlock> => {
  const resultArray: Array<DrawableBlock> = []
  const worklist: Array<RecursiveDrawLayer> = [
    { layerNum: 0, startX: 0, data: indata },
  ]
  const blockHeightInPixels = FlamechartDataContainer.blockHeightInPixels
  const totalBlockSpace = FlamechartDataContainer.totalBlockSpace

  // we manually break the while loop when there aren't more workItems to process
  while (true) {
    const workItem = worklist.pop()

    if (workItem === undefined) {
      break
    }

    let xDisplacement: number = 0

    workItem.data.Callees.forEach(callee => {
      worklist.push({
        layerNum: workItem.layerNum + 1,
        startX: workItem.startX + xDisplacement,
        data: callee,
      })

      xDisplacement += callee.Samples
    })

    workItem.data.Rectangle = {
      xCoordinate: workItem.startX,
      yCoordinate: workItem.layerNum * totalBlockSpace,
      Height: blockHeightInPixels,
      LayerNumber: workItem.layerNum,
    }

    const drawableBlock = {
      ...workItem.data,
      PercentageEstimate: (workItem.data.Samples / indata.Samples) * 100,
      OriginalFlamegraphNode: workItem.data,
    } as DrawableBlock

    drawableBlock.computedDisplayName = blockTextString(drawableBlock, null)

    // Create a rectangle for the current element.
    resultArray.push(drawableBlock)
  }

  return resultArray
}

/**
 * Flamecharts can be fairly large, contain many components that are not necessarily visible at a
 * given zoom level. The FlamechartDataContainer manages access to the rectangles for the chart,
 * allowing the easy querying of "which elements are visible at my current zoom level".
 */
export class FlamechartDataContainer {
  /**
   * defines the visual frame height in pixels
   * all height related calculations need to use this value, this way we can simply update the
   * constant here and have the graph update accordingly without changing any other line of code
   *
   * we cant do the same for the block width as it will depend on the samples & screen width
   */
  static blockHeightInPixels = 30
  static blockVerticalMarginInPixels = 4
  static totalBlockSpace =
    FlamechartDataContainer.blockHeightInPixels +
    FlamechartDataContainer.blockVerticalMarginInPixels

  /**
   * The maximum X coordinate.
   * Corresponds to the total number of samples seen in the Flamegraph JSON description
   */
  private maxX: number

  /**
   * The maximum Y coordinate. Corresponds to the "deepest" stack trace (level) in the Flamegraph
   * times FlamechartDataContainer.blockHeightInPixels.
   * Example: If the deepest trace is 10 frames, maxY will be 10 * 30 = 300.
   *
   * To allow fast selection of "only the rectangles we care about", we keep an  array-of-array-of-array:
   * The rectangles are bucketed first by frame index (so we can eliminate layers of the diagram that
   * are currently not visible), then by size (as power-of-2, rounded down - this allows us to
   * eliminate rectangles that would be too small to display), and are lastly kept sorted by start-x-address.
   *
   * Since they are sorted by x-address, and their size is bounded by the bucket they are in,
   * subselecting an x-range is also fast.
   */
  private maxY: number

  private rootBlock: DrawableBlock

  /**
   * the all blocks are stored ordered by the sample size (biggest first), to get the root we
   * store a pointer to the this.rootBlock
   */
  private allBlocks: Array<DrawableBlock>

  /**
   * this is used to increase performance when getting / searching the blocks we need to render
   * contains the same blocks as in `allBlocks`
   *
   * for details you can check the `getVisibleBlocks` function
   */
  private allBlocksBySize: Array<Array<Array<DrawableBlock>>> = new Array<
    Array<Array<DrawableBlock>>
  >()

  // The total number of traces in the time period.
  private totalTraces: number

  // The total number of seconds covered by the time period.
  private totalSeconds: number

  // The number of traces this flamegraph was built on.
  private sampledTraces: number

  // Run through all blocks by size container and ensure that all necessary arrays are initialized.
  private initializeBlocksBySize() {
    // Calculate the maximum size and the maximum frame index. This is an extra pass over the
    // recangles and could be rolled into the following loop, but keeping a separate loop makes the
    // code more readable.
    let maxLog2Size: number = 0
    let maxLayer: number = 0

    this.allBlocks.forEach(block => {
      maxLog2Size = Math.max(maxLog2Size, Math.floor(Math.log2(block.Samples)))
      maxLayer = Math.max(maxLayer, block.Rectangle.LayerNumber)
    })

    for (let layerIndex = 0; layerIndex <= maxLayer; layerIndex++) {
      const newArray: Array<Array<DrawableBlock>> = new Array<
        Array<DrawableBlock>
      >()
      this.allBlocksBySize[layerIndex] = newArray

      for (let sizeIndex = 0; sizeIndex <= maxLog2Size; sizeIndex++) {
        const newRectArray: Array<DrawableBlock> = new Array<DrawableBlock>()
        newArray[sizeIndex] = newRectArray
      }
    }
  }

  // fills the all block by size container with the blocks
  private fillBlocksBySize() {
    const totalBlockSpace = FlamechartDataContainer.totalBlockSpace

    // Now place the blocks into their correct container.
    this.allBlocks.forEach(block => {
      if (block.Samples === 0) {
        return
      }

      const sizeIndex = Math.floor(Math.log2(block.Samples))
      const rect = block.Rectangle

      this.allBlocksBySize[rect.LayerNumber][sizeIndex].push(block)
      this.maxX = Math.max(this.maxX, rect.xCoordinate + block.Samples)
      this.maxY = Math.max(this.maxY, (rect.LayerNumber + 1) * totalBlockSpace)
    })
  }

  // Sort the leaf arrays in all blocks by size
  private sortAllBlocksBySize() {
    this.allBlocksBySize.forEach(sizeContainer => {
      sizeContainer.forEach(leafArray => {
        leafArray.sort((n1, n2) => {
          if (n1.Rectangle === undefined && n2.Rectangle === undefined) {
            console.error('This should never be reached')
            return -1
          }

          return n1.Rectangle.xCoordinate - n2.Rectangle.xCoordinate
        })
      })
    })
  }

  constructor(inputdata: BackendFlamegraph) {
    // Initialize the maxX and maxY values.
    this.maxX = 0
    this.maxY = 0
    this.totalTraces = inputdata.TotalTraces!
    this.totalSeconds = inputdata.TotalSeconds!
    this.sampledTraces = inputdata.Samples!

    // Walk through the BackendFlamegraph, layer-by-layer, and ensure that each block has the
    // necessary data attached to draw it correctly.
    const allUnorderedBlocks = backendflamechartToDrawable(inputdata)
    this.rootBlock = allUnorderedBlocks[0]
    this.allBlocks = allUnorderedBlocks.sort(
      (block1, block2) => block2.Samples - block1.Samples
    )

    // all blocks by size setup
    this.initializeBlocksBySize()
    this.fillBlocksBySize()
    this.sortAllBlocksBySize()
  }

  public getDimensions(): number[] {
    return [this.maxX, this.maxY]
  }

  public getAllBlocks(): Array<DrawableBlock> {
    return this.allBlocks
  }

  public getRootBlock(): DrawableBlock {
    return this.rootBlock
  }

  // For a given rectangle in the greater diagram at a given resolution, return the blocks that
  // should be drawn.
  public getVisibleBlocks(view: VisibleView): Array<DrawableBlock> {
    const result = new Array<DrawableBlock>()
    const totalBlockSpace = FlamechartDataContainer.totalBlockSpace

    // Calculate the minimum and maximum visible frame index.
    const minFrameIndex = Math.max(
      Math.floor(view.yCoordinate / totalBlockSpace),
      0
    )
    const maxFrameIndex = Math.ceil(
      (view.yCoordinate + view.height) / totalBlockSpace
    )

    // Calculate the minimum visible size. Anything smaller than half a pixel will be hidden.
    const sizeOfOnePixelInSamples = view.width / view.xResolution
    const sizeOfHalfPixelInSamples = sizeOfOnePixelInSamples / 2
    const minSizeIndex = Math.floor(
      Math.max(Math.log2(sizeOfHalfPixelInSamples) + 1, 0)
    )
    const maxContainerProcessableIndex = Math.min(
      this.allBlocksBySize.length,
      maxFrameIndex
    )

    for (
      let frameIndex = minFrameIndex;
      frameIndex < maxContainerProcessableIndex;
      frameIndex++
    ) {
      // Iterate through the visible frame buckets.
      const sizeContainer = this.allBlocksBySize[frameIndex]

      // Iterate through size buckets, skipping too small blocks.
      for (
        let sizeIndex = minSizeIndex;
        sizeIndex < sizeContainer.length;
        sizeIndex++
      ) {
        const xContainer = sizeContainer[sizeIndex]

        /**
         * Any block whose xCoordinate + 2**sizeIndex is smaller than view.xCoordinate can not be
         * visible. Any block whose xCoordinate is greater than xCoordinate+width can also not be
         * visible
         */
        if (xContainer.length === 0) {
          continue
        }

        const maxBlockWidth = Math.pow(2, sizeIndex)

        const rightBorderBlockIndex =
          binarySearchLowerLimit(
            (idx: number) => {
              return xContainer[idx].Rectangle.xCoordinate
            },
            view.xCoordinate + view.width,
            0,
            xContainer.length - 1
          ) + 1

        const leftBorderBlockIndex = binarySearchLowerLimit(
          (idx: number): number => {
            return xContainer[idx].Rectangle.xCoordinate
          },
          view.xCoordinate - maxBlockWidth,
          0,
          xContainer.length - 1
        )

        /**
         * Copy the potentially visible blocks into the result array. Check before copying if the
         * necessary predicates are true.
         */
        for (let i = leftBorderBlockIndex; i < rightBorderBlockIndex; i++) {
          const candidate = xContainer[i]

          if (
            candidate.Rectangle.xCoordinate + candidate.Samples <
            view.xCoordinate
          ) {
            continue
          }

          if (candidate.Rectangle.xCoordinate > view.xCoordinate + view.width) {
            continue
          }

          result.push(xContainer[i])
        }
      }
    }

    return result
  }

  /**
   *
   * @param searchTerm the string used for the search. Can contain patters to search specific parts
   * of the trace e.g.: `function:run file:python`
   * @param filterWithRegex if `true` a regex is used, otherwise we use a simple string `includes()`
   * @param filterWithCaseSensitive if `true` searchTerm turns to case sensitive and we won't lowercase it to compare,
   * @returns an object with 2 arrays - 1 containing the blocks that match and another one containg
   * the blocks that do not match
   */
  public getBlocksMatchingSearch(
    searchTerm: string,
    filterWithRegex: boolean,
    filterWithCaseSensitive: boolean
  ): {
    matchingBlocks: Array<DrawableBlock>
    nonMatchingBlocks: Array<DrawableBlock>
  } {
    const matchingBlocks: Array<DrawableBlock> = []
    const nonMatchingBlocks: Array<DrawableBlock> = []
    const patternSeparator = ':'
    const functionNamePatternStart = `function${patternSeparator}`
    const functionFilePatternStart = `file${patternSeparator}`
    const functionExePatternStart = `exe${patternSeparator}`

    // ensure we use case insensitive search if filterWIthCaseSensitive is false
    if (!filterWithCaseSensitive) {
      searchTerm = searchTerm.toLowerCase()
    }

    // simplest case - by default we use case insensitive search on the text displayed by the block
    const regex =
      filterWithRegex && filterWithCaseSensitive
        ? safeRegexCreator(searchTerm)
        : filterWithRegex && !filterWithCaseSensitive
        ? safeRegexCreator(searchTerm, 'i')
        : null

    let matcherFunction = (block: DrawableBlock): boolean => {
      if (filterWithRegex) {
        // when using regex without patterns we match on all the fields shown in the block
        return (
          regex !== null &&
          (block.computedDisplayName.match(regex) !== null ||
            getFunctionName(block).match(regex) !== null ||
            block.SourceFilename.match(regex) !== null)
        )
      }

      if (filterWithCaseSensitive) {
        return block.computedDisplayName.includes(searchTerm)
      }

      return block.computedDisplayName.toLowerCase().includes(searchTerm)
    }

    const searchContainsPattern =
      searchTerm.includes(functionNamePatternStart) ||
      searchTerm.includes(functionFilePatternStart) ||
      searchTerm.includes(functionExePatternStart)

    // case when the user uses patterns to match on specific parts of the trace
    if (searchContainsPattern) {
      /**
       * we handle the search part by part
       * e.g.: "function:run file:python" -> ["function:run", "file:python"]
       */
      const searchParts = searchTerm.split(' ')
      const matchers = new Array<(block: DrawableBlock) => boolean>()

      searchParts.forEach((searchPart: string) => {
        // e.g.: "function:run" -> ["function", "run"]
        const [, searchString] = searchPart.split(patternSeparator)
        const regex = filterWithRegex
          ? safeRegexCreator(searchString, 'i')
          : null

        // decide which part of the block do we want to use in the regex
        if (searchPart.includes(functionNamePatternStart)) {
          matchers.push(block => {
            const stringToMatch = getFunctionName(block)

            if (filterWithRegex) {
              return regex !== null && stringToMatch.match(regex) !== null
            }

            if (filterWithCaseSensitive) {
              return stringToMatch.includes(searchString)
            }

            return stringToMatch.toLowerCase().includes(searchString)
          })
        } else if (searchPart.includes(functionFilePatternStart)) {
          matchers.push(block => {
            const stringToMatch = block.SourceFilename

            if (filterWithRegex) {
              return regex !== null && stringToMatch.match(regex) !== null
            }

            if (filterWithCaseSensitive) {
              return stringToMatch.includes(searchString)
            }

            return stringToMatch.toLowerCase().includes(searchString)
          })
        } else if (searchPart.includes(functionExePatternStart)) {
          matchers.push(block => {
            const stringToMatch = getExeFileName(
              block.ExeFileName,
              block.FrameType
            )

            if (filterWithRegex) {
              return regex !== null && stringToMatch.match(regex) !== null
            }

            if (filterWithCaseSensitive) {
              return stringToMatch.includes(searchString)
            }

            return stringToMatch.toLowerCase().includes(searchString)
          })
        }
      })

      // construct a single matcher function that is composed of all the matchers defined early
      matcherFunction = matchers.reduce((accumulator, matcher) => {
        return block => {
          return matcher(block) && accumulator(block)
        }
      })
    }

    this.allBlocks.forEach(block => {
      if (matcherFunction(block)) {
        matchingBlocks.push(block)
      } else {
        nonMatchingBlocks.push(block)
      }
    })

    return { matchingBlocks, nonMatchingBlocks }
  }

  public getBlockAt(x: number, y: number): DrawableBlock | null {
    const totalBlockSpace = FlamechartDataContainer.totalBlockSpace

    const verticalFrameLevel = Math.floor(y / totalBlockSpace)

    // Fetch the blocks at that vertical level (y)
    const sizeContainer = this.allBlocksBySize[verticalFrameLevel]

    if (sizeContainer === undefined) {
      return null
    }

    for (const xContainer of sizeContainer) {
      for (let block of xContainer) {
        const { xCoordinate, yCoordinate, Height } = block.Rectangle

        const isXInsideBlock =
          xCoordinate <= x && xCoordinate + block.Samples >= x
        const isYInsideBlock = yCoordinate <= y && yCoordinate + Height >= y

        if (isXInsideBlock && isYInsideBlock) {
          return block
        }
      }
    }

    return null
  }
}

/**
 * In order to display differential Flamecharts accurately, we need to "match" them - e.g. as far
 * as possible, each node in one Flamechart needs to be associated with the corresponding node in
 * the other Flamechart.
 */
export class FlamechartDiffMatch {
  private scalingFactor: number
  private nodeMap: Map<BackendFlamegraph, BackendFlamegraph>

  constructor(
    graph1: BackendFlamegraph,
    graph2: BackendFlamegraph,
    scaling: number
  ) {
    // The traversal of the Flamegraph is done using a standard BFS worklist algorithm; given that
    // pairs of nodes are processed, use an array of tuples of BackendFlamegraph.
    const worklist: [BackendFlamegraph, BackendFlamegraph][] = [
      [graph1, graph2],
    ]
    this.scalingFactor = scaling
    this.nodeMap = new Map()

    while (worklist.length > 0) {
      const workitem:
        | [BackendFlamegraph, BackendFlamegraph]
        | undefined = worklist.pop()
      if (workitem !== undefined) {
        this.matchChildren(workitem, worklist)
      }
    }
  }

  public hasMatch(node: BackendFlamegraph) {
    return this.nodeMap.has(node)
  }

  public getMatch(node: BackendFlamegraph) {
    return this.nodeMap.get(node)
  }

  public getScaling() {
    return this.scalingFactor
  }

  public getPercentDelta(x: BackendFlamegraph) {
    const match = this.getMatch(x)

    if (match === undefined) {
      return 1000.0
    }
    return (match.Samples * this.scalingFactor) / x.Samples - 1.0
  }

  private detailedLookupString(frame: BackendFlamegraph) {
    let frameID: string

    // For details see processFrameForGrouping in pf-web-service/handlers/common/common.go.
    // Using semicolon as separator as it's less likely to occur in the field values.
    if (frame.FunctionName !== '') {
      if (frame.SourceFilename !== '') {
        // fully symbolized frame
        frameID = `${frame.ExeFileName};${encodeURIComponent(
            frame.SourceFilename
        )};${encodeURIComponent(frame.FunctionName)};;`
      } else {
        // ELF-symbolized frame
        frameID = `;;${encodeURIComponent(frame.FunctionName)};${frame.FileID};`
      }
    } else {
      // unsymbolized frame
      frameID = `;;;${frame.FileID};${frame.AddressOrLine}`
    }

    return frameID
  }

  private matchChildren(
    pair: [BackendFlamegraph, BackendFlamegraph],
    worklist: [BackendFlamegraph, BackendFlamegraph][]
  ) {
    const [graph1, graph2] = pair

    const searchMapDetailed = new Map(
      graph2.Callees.map(x => [this.detailedLookupString(x), x])
    )

    for (let callee of graph1.Callees) {
      let lookupDetailed: string = this.detailedLookupString(callee)

      if (searchMapDetailed.has(lookupDetailed)) {
        const match = searchMapDetailed.get(lookupDetailed)!
        this.nodeMap.set(callee, match)
        worklist.push([callee, match])

        continue
      }
    }
  }
}
