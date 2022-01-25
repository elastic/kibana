import { FC, useEffect, useRef, useState, useMemo, useCallback } from "react";
import * as Pixi from "pixi.js";

import { Viewport } from "pixi-viewport";

import css from "./pixi.module.scss";

import SearchInput from "./components/SearchInput";
import GraphButton from "./components/GraphButton";
import { callgraphLink } from "./components/FunctionLink";
import Switch from "./components/Switch";

import { TooltipPosition } from "./components/GraphTooltip";

import {
  BackendFlamegraph,
  FlamechartDataContainer,
  FlamechartDiffMatch,
  DrawableBlock
} from "./helpers/flamechartDataContainer";
import { frameTypeToColors } from "./helpers/frameTypeToColors";

import {
  TypeOfGraph,
  getEstimatesForBlock,
  PerBlockEstimates
} from "./helpers/getEstimatesForBlock";

import { BitmapTextEllipse } from "./helpers/BitmapTextEllipse";
import {
  canvasSize,
  clamp,
  resize,
  resetPixi,
  useResizeListenerEffect
} from "./helpers/lifecycle";

import debounce from "./helpers/debounce";

const TYPE_OF_GRAPH = TypeOfGraph.Flamegraph;

interface Props {
  sidebar?: boolean;
  windowWidth?: number;
  data: any;
  blockMatch?: FlamechartDiffMatch | null; // The optional mapping to the 2nd flamegraph for diff.
  projectId: string;
  showBlockInfo: (
    block: DrawableBlock | null,
    estimates: PerBlockEstimates | null
  ) => void;
  showBlockTooltip: (
    block: DrawableBlock | null,
    placement: TooltipPosition | null
  ) => void;
  setClickedBlockInfo: (block: DrawBlockWithUI) => void;
  blockCoordinatesFromQueryFilter?: string | null | undefined;
  activeSwitch?: number;
  graphBData?: BackendFlamegraph | null | undefined;
  isDifferential?: boolean;
  userChoseSwitchOption?: (value: number) => void;
}

const DOUBLE_CLICK_TIME_MS = 250;
const TEXT_PADDING = 10;

// maximum percent to allow to zoom out the viewport (as a percentage of the scene's width)
const CLAMP_MAXIMUM_ZOOM_OUT_PERCENT = 2;

// if you adjust this, please adjust in the pixi.module.css the button positioning
const HORIZONTAL_PADDING_IN_PIXELS = 100;

export interface DrawBlockWithUI extends DrawableBlock {
  // we use sprite instead of a rectangle to increase performance
  uiShape: Pixi.Sprite;
  uiText: BitmapTextEllipse;
  originalTint: number;
}

/**
 * Helper functions to do linear interpolation between two colors.
 */
const linearInterpolate = (
  start: number,
  end: number,
  percentage: number
): number => {
  // ensure that the percentage is in the range of [0, 1]
  percentage = Math.min(percentage, 1);
  percentage = Math.max(percentage, 0);

  const delta = (end - start) * percentage;

  return start + delta;
};

const GREY = 0xc0c0c0;
const RED = 0xff0000;
const GREEN = 0x00ff00;

const findColorBetween = (
  start: number,
  end: number,
  percentage: number
): number => {
  const redA: number = (start & 0xff0000) >> 16;
  const redB: number = (end & 0xff0000) >> 16;
  const greenA: number = (start & 0xff00) >> 8;
  const greenB: number = (end & 0xff00) >> 8;
  const blueA: number = start & 0xff;
  const blueB: number = end & 0xff;

  const red = linearInterpolate(redA, redB, percentage);
  const green = linearInterpolate(greenA, greenB, percentage);
  const blue = linearInterpolate(blueA, blueB, percentage);

  return (red << 16) | (green << 8) | blue;
};

/**
 * As we can't use borders on the blocks (would enforce that the blocks have at least 2 pixels, which
 * would not be visually true in terms of width and x positioning),
 * we distinguish 2 adjacent block of the same type by using a different variation of the color
 *
 * vertically we don't need to distinguish 2 blocks as we use a vertical space between them
 */
const colorFromBlock = (block: DrawableBlock): number => {
  const colorVariations =
    frameTypeToColors.get(block.FrameType) || frameTypeToColors.get(0)!;
  const colorIndex =
    block.Rectangle.xCoordinate % colorVariations.colors.length;

  return colorVariations.colors[colorIndex];
};

const colorFromBlockDiff = (
  block: DrawableBlock,
  match: FlamechartDiffMatch,
  activeSwitch: number,
  graphADataSamples: number,
  graphBDataSamples: number
): number => {
  const baseNode: BackendFlamegraph = block.OriginalFlamegraphNode;

  if (baseNode.ExeFileName === "root") {
    if (graphBDataSamples > graphADataSamples) {
      return RED;
    } else if (graphBDataSamples < graphADataSamples) {
      return GREEN;
    } else {
      return GREY;
    }
  }

  // If the node has no match, color it deep red.
  if (!match.hasMatch(baseNode)) {
    return GREEN;
  }

  const otherNode: BackendFlamegraph = match.getMatch(baseNode)!;

  if (activeSwitch === 1) {
    // This is the `Inclusive CPU` of the block
    const baseNodePercentageEstimate =
      (baseNode.Samples / graphADataSamples) * 100;
    const otherNodePercentageEstimate =
      (otherNode.Samples / graphBDataSamples) * 100;

    if (otherNodePercentageEstimate < baseNodePercentageEstimate) {
      const percentage =
        baseNodePercentageEstimate / otherNodePercentageEstimate / 100;

      return findColorBetween(GREY, GREEN, percentage);
    } else {
      // Current node is "more expensive" than the old node, so pick a red hue.
      const percentage =
        otherNodePercentageEstimate / baseNodePercentageEstimate / 100;

      return findColorBetween(GREY, RED, percentage);
    }
  } else {
    if (otherNode.Samples >= baseNode.Samples) {
      // Current node is "more expensive" than the old node, so pick a red hue.
      const percentage = otherNode.Samples / baseNode.Samples / 100;

      return findColorBetween(GREY, RED, percentage);
    } else {
      // Current node is "cheaper" than the old node, so pick a green hue.
      const percentage = baseNode.Samples / otherNode.Samples / 100;

      return findColorBetween(GREY, GREEN, percentage);
    }
  }
};

/**
 * Function to calculate the new center of the viewport after clicking on a block.
 */
const calculateNewCenter = (
  block: DrawableBlock,
  { screenHeightInWorldPixels }: Viewport
): Pixi.Point => {
  const verticalPaddingInPixels = 70;
  const newXCenter = block.Rectangle.xCoordinate + block.Samples / 2;
  const newYCenter =
    block.Rectangle.yCoordinate -
    verticalPaddingInPixels +
    screenHeightInWorldPixels / 2;

  return new Pixi.Point(newXCenter, newYCenter);
};

const selectBlock = (block: DrawBlockWithUI) => {
  /**
   * ideally we would have a (out)line that we would change the color when the block was selected,
   * which would give a nice outline effect to the user
   * Problem is that when zooming in into deeper blocks the line would be very thick :'(
   * (we actually tried it) So we opted for an alpha effect instead
   */
  block.uiShape.alpha = 0.5;
  block.uiText.bold = true;
};

const unSelectBlock = (block: DrawBlockWithUI) => {
  block.uiShape.alpha = 1;
  block.uiText.bold = false;
};

const markBlockAsUnMatched = (block: DrawBlockWithUI) => {
  block.uiShape.tint = 0xc2c4cc;
};

const unMarkBlockAsUnMatched = (block: DrawBlockWithUI) => {
  block.uiShape.tint = block.originalTint;
};

/**
 * Initialize a block by adding a sprite of the right dimensions to it.
 */
const setupBlockUI = (
  block: DrawBlockWithUI,
  viewport: Viewport,
  colorizer: (block: DrawableBlock) => number
) => {
  const rectangleColor = colorizer(block);

  const sprite = Pixi.Sprite.from(Pixi.Texture.WHITE);
  sprite.width = block.Samples;
  sprite.height = block.Rectangle.Height;
  sprite.position.set(block.Rectangle.xCoordinate, block.Rectangle.yCoordinate);
  block.originalTint = sprite.tint = rectangleColor;

  const text = new BitmapTextEllipse(block.computedDisplayName);
  text.scale.set(1 / viewport.scale.x, 1 / viewport.scale.y);
  text.position.set(
    sprite.x + TEXT_PADDING / viewport.scale.x,
    sprite.y + (sprite.height / 2 - text.height / 2)
  );

  block.uiShape = viewport.addChild(sprite);
  block.uiText = viewport.addChild(text);

  // ensure all block have the unselected style on start
  unSelectBlock(block);
};

/**
 * cull blocks and text that are on the screen
 * @param allBlocks - all blocks for culling
 * @param viewport
 */
const cullBlocks = (allBlocks: DrawableBlock[], viewport: Viewport) => {
  const bounds = viewport.getVisibleBounds();
  const scaleX = viewport.scale.x;
  const reverseScaleX = 1 / scaleX;
  const padding = TEXT_PADDING * reverseScaleX;

  for (const block of allBlocks as DrawBlockWithUI[]) {
    const uiShape = block.uiShape;
    const uiText = block.uiText;

    const shapeWidth = block.uiShape.width;
    const shapeWidthUnscaled = shapeWidth * scaleX;

    if (
      uiShape.x < bounds.right &&
      uiShape.x + shapeWidth > bounds.left &&
      uiShape.y < bounds.bottom &&
      uiShape.y + uiShape.height > bounds.top
    ) {
      uiShape.visible = uiText.visible = true;
      uiText.scale.x = reverseScaleX;
      uiText.x = uiShape.x + padding;
      uiText.cull(shapeWidthUnscaled - TEXT_PADDING);
    } else {
      uiShape.visible = uiText.visible = false;
    }
  }
};

export const FlameGraph: FC<Props> = ({
  data,
  blockMatch, // The optional FlamechartDiffMatch to compare against a second graph.
  projectId,
  showBlockInfo,
  showBlockTooltip,
  sidebar,
  windowWidth,
  setClickedBlockInfo,
  blockCoordinatesFromQueryFilter,
  graphBData,
  isDifferential,
  activeSwitch = 0,
  userChoseSwitchOption
}) => {
  // Disable default hello message in console
  Pixi.utils.skipHello();

  const container = new FlamechartDataContainer(data);
  const [maxX, maxY] = container.getDimensions();

  const [renderer] = useState(
    () =>
      new Pixi.Renderer({
        backgroundAlpha: 0,
        autoDensity: true,
        resolution: window.devicePixelRatio,
        antialias: true
      })
  );
  const [viewport] = useState(
    () =>
      new Viewport({
        worldWidth: maxX,
        worldHeight: maxY,
        interaction: renderer.plugins.interaction // the interaction module is important
        // for wheel to work properly when renderer.view is placed or scaled
      })
  );


  // disables hittest for children of viewport (to improve perf since there are so many blocks)
  viewport.interactiveChildren = false;

  /**
   * due to using Pixi, which has its own render loop, we use `useRef` for every property that we
   * want to change but that we don't want the `useEffect` / pixi setup to run
   *
   * If we were to use `useState` it would trigger again the `useEffect` that sets up pixi and
   * would cause the blocks to render again
   */
  const gameCanvasRef = useRef<HTMLDivElement>(null);

  // Define the value as 0 to focus on `root`
  let selectedBlockIndex = 0;

  /**
   * This conditional will split the string from `blockCoordinatesFromQueryFilter`
   * That is "xCoordinate-yCoordinate-LayerNumber"
   * And will filter `allBlocks` looking for a block that has this exact values
   * If there is a block on `allBlocks` with this characteristics
   * We'll find its index and `selectedBlockIndex` will have this same index
   * So that we can use it on `selectedBlockRef`
   * And successfully focus on the coordinates that exist on the queryFilter
   */
  if (blockCoordinatesFromQueryFilter) {
    const blockPropertiesFromVariable = blockCoordinatesFromQueryFilter.split(
      "-"
    );
    const allBlocks = container.getAllBlocks();

    /**
     * blockPropertiesFromVariable[0] = xCoordinate
     * blockPropertiesFromVariable[1] = yCoordinate
     * blockPropertiesFromVariable[2] - LayerNumber
     */
    let indexOfFilteredBlock = allBlocks.findIndex(
      block =>
        block.Rectangle.xCoordinate ===
          parseInt(blockPropertiesFromVariable[0]) &&
        block.Rectangle.yCoordinate ===
          parseInt(blockPropertiesFromVariable[1]) &&
        block.Rectangle.LayerNumber === parseInt(blockPropertiesFromVariable[2])
    );

    /**
     * The user might insert a random value on our parameterers
     * So we need to check this condition
     */
    if (indexOfFilteredBlock === -1) {
      indexOfFilteredBlock = 0;
    }

    selectedBlockIndex = indexOfFilteredBlock;
  }

  // the block the is currently selected by the user
  const selectedBlockRef = useRef(
    container.getAllBlocks()[selectedBlockIndex] as DrawBlockWithUI
  );

  /**
   * Set the viewport to be centered on the block at world coordinate x and y; animate the
   * transition to get there.
   *
   * We had to move this function to inside PixiComponent so that
   * our `setClickedBlockInfo` would work for the history buttons
   * and also for the search buttons
   */
  const centerOnBlock = useCallback(
    (
      blockToCenter: DrawBlockWithUI,
      currentlySelectedBlock: DrawBlockWithUI | null,
      canvas: HTMLDivElement,
      viewport: Viewport,
      animationDuration = 1000
    ): DrawBlockWithUI => {
      if (currentlySelectedBlock) {
        unSelectBlock(currentlySelectedBlock);
      }

      // Select the new block and set the alpha.
      selectBlock(blockToCenter);

      setClickedBlockInfo(blockToCenter);

      const { width: pixiWidth } = canvasSize(canvas);
      const newScale =
        (pixiWidth - HORIZONTAL_PADDING_IN_PIXELS) / blockToCenter.Samples;
      const newCenter = calculateNewCenter(blockToCenter, viewport);

      viewport.animate({
        time: animationDuration,
        position: newCenter,
        ease: "easeInOutSine",
        scaleX: newScale,
        scaleY: viewport.scale.y
      });

      /**
       * if we try to center on a block that is already centered, the viewport is not marked as dirty
       * happens if we center a block -> dbl-click on another -> click on previous block
       */
      viewport.dirty = true;

      return blockToCenter;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  /////////////////////////////////////////
  //      Popup & Tooltip Handling      //
  ///////////////////////////////////////
  /**
   * We use `useCallback` & `useRef` to avoid triggering the `useEffect` that sets up the events on the
   * viewport every time a prop changes
   */
  const removeTooltip = useCallback(() => {
    showBlockTooltip(null, null);
  }, [showBlockTooltip]);

  const showTooltip = useCallback(
    (block: DrawableBlock | null, location: Pixi.Point) => {
      showBlockTooltip(block, { left: location.x, top: location.y });
    },
    [showBlockTooltip]
  );

  const removeBlockModal = useCallback(() => {
    showBlockInfo(null, null);
  }, [showBlockInfo]);

  const showBlockModal = useCallback(
    (block: DrawableBlock) => {
      const estimates = getEstimatesForBlock(block, container, TYPE_OF_GRAPH);
      showBlockInfo(block, estimates);
    },
    [container, showBlockInfo]
  );
  /////////////////////////////////////////
  //  End of: Popup & Tooltip Handling  //
  ///////////////////////////////////////

  /////////////////////////////////////////
  //           Search Handling           //
  ///////////////////////////////////////

  const [filterText, setFilterText] = useState("");
  const [filterCount, setFilterCount] = useState(0);
  const [filterTotalCount, setFilterTotalCount] = useState(0);
  const [filterWithRegex, setFilterWithRegex] = useState(false);
  const [filterWithCaseSensitive, setFilterWithCaseSensitive] = useState(false);

  // based on: https://kyleshevlin.com/debounce-and-throttle-callbacks-with-react-hooks
  const debouncedSearch = useMemo(
    () =>
      debounce(
        (
          searchTerm: string,
          filterWithRegex: boolean,
          filterWithCaseSensitive: boolean,
          container: FlamechartDataContainer
        ) => {
          if (!gameCanvasRef.current) {
            return;
          }

          // deselect all previously marked blocks
          container.getAllBlocks().forEach(block => {
            unMarkBlockAsUnMatched(block as DrawBlockWithUI);
          });

          if (searchTerm.length === 0) {
            // ensure block visuals get updated
            viewport.dirty = true;

            return;
          }

          const {
            matchingBlocks,
            nonMatchingBlocks
          } = container.getBlocksMatchingSearch(
            searchTerm,
            filterWithRegex,
            filterWithCaseSensitive
          );

          // mark not-matching blocks
          nonMatchingBlocks.forEach(block => {
            markBlockAsUnMatched(block as DrawBlockWithUI);
          });

          // update counters
          setFilterCount(0);
          setFilterTotalCount(matchingBlocks.length);

          // recenter zoom
          const rootBlock = container.getRootBlock() as DrawBlockWithUI;

          selectedBlockRef.current = centerOnBlock(
            rootBlock,
            selectedBlockRef.current,
            gameCanvasRef.current,
            viewport
          );
        },
        250
      ),
    [centerOnBlock, viewport]
  );

  const handleSearchChange = useCallback(
    e => {
      removeBlockModal();

      const searchTerm = e.target.value;
      setFilterText(searchTerm);
      debouncedSearch(
        searchTerm,
        filterWithRegex,
        filterWithCaseSensitive,
        container
      );
    },
    [
      debouncedSearch,
      removeBlockModal,
      container,
      filterWithRegex,
      filterWithCaseSensitive
    ]
  );

  const nextSearchMatch = () => {
    if (!gameCanvasRef.current) {
      return;
    }

    removeBlockModal();

    /**
     * in this case we preferred for less logic, instead of storing the results in
     * a variable, over performance
     */
    const { matchingBlocks } = container.getBlocksMatchingSearch(
      filterText,
      filterWithRegex,
      filterWithCaseSensitive
    );

    const nextBlock = matchingBlocks[filterCount] as DrawBlockWithUI;

    setFilterCount(oldFilterCount => oldFilterCount + 1);

    // we only center on the block, but we don't mark it as selected
    selectedBlockRef.current = centerOnBlock(
      nextBlock,
      selectedBlockRef.current,
      gameCanvasRef.current,
      viewport
    );
  };

  const previousSearchMatch = () => {
    if (!gameCanvasRef.current) {
      return;
    }

    removeBlockModal();

    /**
     * in this case we preferred for less logic, instead of storing the results in
     * a variable, over performance
     */
    const { matchingBlocks } = container.getBlocksMatchingSearch(
      filterText,
      filterWithRegex,
      filterWithCaseSensitive
    );

    const previousBlock = matchingBlocks[filterCount - 2] as DrawBlockWithUI;
    setFilterCount(oldFilterCount => oldFilterCount - 1);

    // we only center on the block, but we don't mark it as selected
    selectedBlockRef.current = centerOnBlock(
      previousBlock,
      selectedBlockRef.current,
      gameCanvasRef.current,
      viewport
    );
  };

  const handleClearSearch = () => {
    if (!gameCanvasRef.current) {
      return;
    }

    // deselect all previously marked blocks
    container.getAllBlocks().forEach(block => {
      unMarkBlockAsUnMatched(block as DrawBlockWithUI);
    });

    setFilterText("");
    setFilterTotalCount(0);
    setFilterCount(0);

    viewport.dirty = true;
  };

  const handleFilterRegexClick = () => {
    debouncedSearch(
      filterText,
      !filterWithRegex,
      filterWithCaseSensitive,
      container
    );
    setFilterWithRegex(previousValue => !previousValue);
  };

  const handleFilterCaseSensitiveClick = () => {
    debouncedSearch(
      filterText,
      filterWithRegex,
      !filterWithCaseSensitive,
      container
    );
    setFilterWithCaseSensitive(previousValue => !previousValue);
  };

  /////////////////////////////////////////
  //        end of Search Handling       //
  ///////////////////////////////////////

  ///////////////////////////////////
  //     button actions setup     //
  /////////////////////////////////
  /**
   * We use `useCallback` to avoid triggering the `useEffect` that sets up pixi every time a
   * prop changes
   */

  const [backHistoryStack, setBackHistoryStack] = useState<DrawBlockWithUI[]>(
    []
  );
  const [forwardHistoryStack, setForwardHistoryStack] = useState<
    DrawBlockWithUI[]
  >([]);

  const showPreviousBlock = useCallback(() => {
    if (!gameCanvasRef.current) {
      return;
    }

    removeBlockModal();

    const currentBlock = selectedBlockRef.current;
    const newBlock = backHistoryStack[backHistoryStack.length - 1];

    setBackHistoryStack(oldHistory => {
      oldHistory.pop();
      return [...oldHistory];
    });

    if (!newBlock) {
      return;
    }

    // we can't use selectedBlockRef.current as it will update the ref.current and then run the setter
    setForwardHistoryStack(oldHistory => [...oldHistory, currentBlock]);

    selectedBlockRef.current = centerOnBlock(
      newBlock,
      currentBlock,
      gameCanvasRef.current,
      viewport
    );
  }, [removeBlockModal, backHistoryStack, centerOnBlock, viewport]);

  const resetBlockHistory = useCallback(() => {
    if (!gameCanvasRef.current) {
      return;
    }

    const rootBlock = container.getRootBlock() as DrawBlockWithUI;

    removeBlockModal();

    selectedBlockRef.current = centerOnBlock(
      rootBlock,
      selectedBlockRef.current,
      gameCanvasRef.current,
      viewport
    );

    // reset history
    setBackHistoryStack([]);
    setForwardHistoryStack([]);
  }, [container, removeBlockModal, centerOnBlock, viewport]);

  const showNextBlock = useCallback(() => {
    if (!gameCanvasRef.current) {
      return;
    }

    removeBlockModal();

    const currentBlock = selectedBlockRef.current;
    const newBlock = forwardHistoryStack[forwardHistoryStack.length - 1];

    setForwardHistoryStack(oldHistory => {
      oldHistory.pop();
      return [...oldHistory];
    });

    if (!newBlock) {
      return;
    }

    // we can't use selectedBlockRef.current as it will update the ref.current and then run the setter
    setBackHistoryStack(oldHistory => [...oldHistory, currentBlock]);

    selectedBlockRef.current = centerOnBlock(
      newBlock,
      currentBlock,
      gameCanvasRef.current,
      viewport
    );
  }, [removeBlockModal, forwardHistoryStack, centerOnBlock, viewport]);

  const switchChange = useCallback(() => {
    if (!gameCanvasRef.current) {
      return;
    }

    removeBlockModal();

    const currentBlock = selectedBlockRef.current;

    selectedBlockRef.current = centerOnBlock(
      currentBlock,
      currentBlock,
      gameCanvasRef.current,
      viewport
    );
  }, [centerOnBlock, removeBlockModal, viewport]);

  /////////////////////////////////////
  //  end of button actions setup   //
  ///////////////////////////////////

  const adjustScale = useCallback(
    (viewport: Viewport, newWidth: number, newHeight: number) => {
      clamp(viewport);

      const [maxX] = container.getDimensions();

      /**
       * the container has its own scale
       * the x scale is dependant on the samples -> equal to the pixiWidth / max_samples
       */
      viewport.scale.x = (newWidth - HORIZONTAL_PADDING_IN_PIXELS) / maxX;

      /**
       * when it comes to the y, the container defines the height and y position of the blocks in pixels
       * as such, we can use the scale "1 to 1"
       */
      viewport.scale.y = 1;
    },
    [container]
  );

  /**
   * After mounting, add the Pixi Renderer to the div and start the Application.
   * This useEffect is actually the pixi render loop.
   * Should only be triggered again if the data changes
   */
  useEffect(() => {
    const ticker = new Pixi.Ticker();
    const canvas = gameCanvasRef.current;

    if (canvas !== null) {
      // we repeat the declaration here so that we don't need to set it on the deps array
      const [maxX] = container.getDimensions();

      resetPixi(canvas, viewport, renderer);

      resize(canvas, renderer, viewport, adjustScale);

      canvas.appendChild(renderer.view);

      const stageContainer = new Pixi.Container();

      // add the viewport to the stage
      stageContainer.addChild(viewport);

      BitmapTextEllipse.init();

      const allBlocks = container.getAllBlocks();

      let colorizer: (block: DrawableBlock) => number = colorFromBlock;

      if (blockMatch) {
        colorizer = (block: DrawableBlock) => {
          return colorFromBlockDiff(
            block,
            blockMatch!,
            activeSwitch,
            data.Samples,
            graphBData!.Samples
          );
        };
      }
      // prepare (rectangle + text) for each block and add it to the viewport
      allBlocks.forEach(block =>
        setupBlockUI(block as DrawBlockWithUI, viewport, colorizer)
      );

      // ensure that the root block is visually marked as selected
      selectBlock(selectedBlockRef.current);

      clamp(viewport);

      viewport.moveCenter(
        new Pixi.Point(maxX / 2, (viewport.screenHeightInWorldPixels / 2) * 0.9)
      );

      cullBlocks(allBlocks, viewport);

      ticker.add(() => {
        if (viewport.dirty) {
          cullBlocks(allBlocks, viewport);
          renderer.render(stageContainer);
          viewport.dirty = false;
        }
      });

      ticker.start();
    }

    /**
     * Stop the Application when unmounting.
     */
    return () => {
      if (ticker !== undefined) {
        ticker.stop();
      }
    };
  }, [
    blockMatch,
    container,
    renderer,
    viewport,
    adjustScale,
    activeSwitch,
    data.Samples,
    graphBData
  ]);

  /**
   * user actions setup on the viewport
   */
  useEffect(() => {
    if (!gameCanvasRef.current) {
      return;
    }

    const canvas = gameCanvasRef.current;

    viewport.clampZoom({
      maxWidth: viewport.worldWidth * CLAMP_MAXIMUM_ZOOM_OUT_PERCENT,
      independent: true
    });

    viewport
      .drag()
      .decelerate()
      .pinch({ axis: "x" })
      .wheel({ axis: "x" });

    viewport.on("zoomed", () => {
      removeTooltip();
      clamp(viewport);
    });

    // this removes the tooltip when the viewport is being dragged or clicked
    let isDragging = false;

    viewport.on("drag-start", () => {
      isDragging = true;
      removeTooltip();
    });

    /**
     * we preferred to setup the click handler on the viewport instead of directly on each block,
     * the reason being that when installing on the block, smaller blocks would be
     * hard / impossible to click
     */
    canvas.addEventListener("pointerdown", removeTooltip);
    canvas.addEventListener("pointerupoutside", () => (isDragging = false));

    let doubleClickedTimeout: NodeJS.Timeout | null = null;
    canvas.addEventListener("click", (event: MouseEvent) => {
      if (isDragging) {
        isDragging = false;
        return;
      }

      const eventCoordinates = new Pixi.Point(event.offsetX, event.offsetY);
      const worldCoordinates = viewport.toWorld(eventCoordinates);
      const clickedBlock = container.getBlockAt(
        worldCoordinates.x,
        worldCoordinates.y
      ) as DrawBlockWithUI | null;

      // user clicked on an empty space
      if (!clickedBlock) {
        removeBlockModal();
        return;
      }

      /**
       * due to the fact that different OS's have different ways of navigating to the
       * "function definition", we allow all 3 options
       */
      if (event.ctrlKey || event.altKey || event.metaKey) {
        const link = callgraphLink(
          projectId,
          clickedBlock.ExeFileName,
          clickedBlock.SourceFilename,
          clickedBlock.FunctionName,
          clickedBlock.FileID,
          clickedBlock.AdressOrLine
        );

        window.open(`${link}${window.location.search}`, "_blank");

        return;
      }

      // dblclick handler
      if (doubleClickedTimeout) {
        clearTimeout(doubleClickedTimeout);
        doubleClickedTimeout = null;

        const currentSelectedBlock = selectedBlockRef.current;

        if (currentSelectedBlock !== undefined) {
          // as we dont center on the new block, we need to manually deselect the previous block
          unSelectBlock(currentSelectedBlock);

          // we can't use selectedBlockRef.current as it will update the ref.current and then run the setter
          setBackHistoryStack(oldHistory => [
            ...oldHistory,
            currentSelectedBlock
          ]);
        }

        selectBlock(clickedBlock);

        showBlockModal(clickedBlock);

        selectedBlockRef.current = clickedBlock;
        viewport.dirty = true;
      } else {
        // click handler
        // wait to see if the user goes for a double click
        doubleClickedTimeout = setTimeout(() => {
          doubleClickedTimeout = null;

          const currentSelectedBlock = selectedBlockRef.current;

          // user clicked on the block that is selected
          if (clickedBlock === currentSelectedBlock) {
            centerOnBlock(clickedBlock, currentSelectedBlock, canvas, viewport);

            showBlockModal(clickedBlock);

            return;
          }

          // user clicked on a block that is not currently selected / centered
          removeBlockModal();

          if (currentSelectedBlock !== undefined) {
            // we can't use selectedBlockRef.current as it will update the ref.current and then run the setter
            setBackHistoryStack(oldHistory => [
              ...oldHistory,
              currentSelectedBlock
            ]);
          }

          selectedBlockRef.current = centerOnBlock(
            clickedBlock,
            currentSelectedBlock,
            canvas,
            viewport
          );
        }, DOUBLE_CLICK_TIME_MS);
      }
    });

    canvas.addEventListener("mouseleave", () => removeTooltip());

    canvas.addEventListener("mousemove", (e: MouseEvent) => {
      if (isDragging || !gameCanvasRef.current) {
        removeTooltip();
        return;
      }

      const eventCoordinates = new Pixi.Point(e.offsetX, e.offsetY);
      const worldCoordinates = viewport.toWorld(eventCoordinates);

      const hoveredBlock = container.getBlockAt(
        worldCoordinates.x,
        worldCoordinates.y
      );

      gameCanvasRef.current.style.cursor = hoveredBlock ? "pointer" : "auto";
      showTooltip(hoveredBlock, eventCoordinates);
    });
  }, [
    viewport,
    container,
    setBackHistoryStack,
    removeTooltip,
    showBlockModal,
    removeBlockModal,
    showTooltip,
    projectId,
    centerOnBlock
  ]);

  // we need to use the useCallback otherwise the useEffect would be constantly triggered
  const resizeHookCallback = useCallback(
    (canvas: HTMLDivElement, renderer: Pixi.Renderer, viewport: Viewport) => {
      resize(canvas, renderer, viewport, adjustScale);

      // recenter on the previously selected block
      centerOnBlock(
        selectedBlockRef.current,
        selectedBlockRef.current,
        canvas,
        viewport,
        0
      );
    },
    [adjustScale, centerOnBlock]
  );

  // handles resizes whenever the window width / sidebar changes
  useResizeListenerEffect(
    gameCanvasRef,
    renderer,
    viewport,
    windowWidth,
    sidebar,
    resizeHookCallback
  );

  return (
    <div className={css.host}>
      <div className={css.userActionsContainer}>
        <div className={css.historyActionsContainer}>
          <GraphButton
            className={css.controlButton}
            icon="previous"
            onClick={showPreviousBlock}
            disabled={backHistoryStack.length === 0}
          ></GraphButton>
          <GraphButton
            className={css.controlButton}
            icon="recenter"
            onClick={resetBlockHistory}
          ></GraphButton>
          <GraphButton
            className={css.controlButton}
            icon="next"
            onClick={showNextBlock}
            disabled={forwardHistoryStack.length === 0}
          ></GraphButton>
        </div>

        <div className={css.rightSideContainer}>
          <SearchInput
            className={css.filterInput}
            placeholder="Find in graph"
            value={filterText}
            onChange={handleSearchChange}
            currentCount={filterCount}
            totalCount={filterTotalCount}
            onNext={nextSearchMatch}
            onPrevious={previousSearchMatch}
            onClear={handleClearSearch}
            isRegexActive={filterWithRegex}
            onRegex={handleFilterRegexClick}
            isCaseSensitiveActive={filterWithCaseSensitive}
            onCaseSensitive={handleFilterCaseSensitiveClick}
          />
          {isDifferential && (
            <Switch
              options={[
                {
                  label: "Abs"
                },
                {
                  label: "Rel"
                }
              ]}
              activeIdx={activeSwitch}
              onChange={(idx: number) => {
                switchChange();
                userChoseSwitchOption!(idx);
              }}
              pixiSwitch
              dataTooltip="This switch allows you to switch between an absolute and relative comparison between both graphs"
            />
          )}
        </div>
      </div>

      <div className={css.canvas} ref={gameCanvasRef} />
    </div>
  );
};
