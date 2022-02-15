import { DrawableBlock, FlamechartDiffMatch } from './flamechartDataContainer'
import { formatDisplayNumber } from './numbers'
import { unsymbolizedFrameTitle, getExeFileName } from './trace'
import checkIfStringHasParentheses from './checkIfStringHasParentheses'

const isRoot = (block: DrawableBlock) => block.Rectangle.yCoordinate === 0

export function blockTextString(
  block: DrawableBlock,
  blockMatch: FlamechartDiffMatch | null,
  includePercentage = false,
  graphBData?: any
) {
  let textString: string
  if (isRoot(block) && !blockMatch) {
    return (textString = 'root: Represents 100% of CPU time.')
  } else {
    textString = getExeFileName(block.ExeFileName, block.FrameType)

    if (block.FunctionName !== '') {
      const sourceFileName = block.SourceFilename
      const sourceUrl = sourceFileName ? sourceFileName.split('/').pop() : ''
      textString = `${textString}: ${getFunctionName(block)} in ${sourceUrl}#${
        block.SourceLine
      }`
    }

    if (includePercentage) {
      textString += `\nCPU time: ${formatDisplayNumber(
        block.PercentageEstimate
      )}%`
      if (blockMatch === null) {
        textString += ` (${formatDisplayNumber(block.Samples, true)} samples)`
      }
      if (blockMatch != null) {
        let originalNode = block.OriginalFlamegraphNode
        if (blockMatch.hasMatch(originalNode)) {
          let scaledSamples =
            blockMatch.getMatch(originalNode)!.Samples * blockMatch.getScaling()
          textString += `   (${formatDisplayNumber(
            block.Samples,
            true
          )} samples vs `
          textString += `${formatDisplayNumber(scaledSamples, true)} samples)`
          let percentDelta = blockMatch.getPercentDelta(originalNode) * 100
          textString += `\nDelta CPU time: ${formatDisplayNumber(
            -percentDelta
          )}%`
        }
      }
      if (isRoot(block)) {
        textString += `   (${formatDisplayNumber(
          block.Samples,
          true
        )} samples vs `
        textString += `${formatDisplayNumber(
          graphBData.Samples,
          true
        )} samples)`
      }
    }
  }

  if (textString === '') {
    textString = unsymbolizedFrameTitle
  }
  return textString
}

export function getFunctionName(block: DrawableBlock): string {
  return block.FunctionName !== '' &&
    !checkIfStringHasParentheses(block.FunctionName)
    ? `${block.FunctionName}()`
    : block.FunctionName
}
