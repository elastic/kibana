export const unsymbolizedFrameTitle = '<unsymbolized frame>'

// TODO we need to unify the data modeling with the callgraph and other screens
// https://optimyze2.myjetbrains.com/youtrack/issue/PF-1380
export const getExeFileName = (exeFileName: string, frameType: number): string => {
  if (exeFileName === undefined) {
    // virtual block without FunctionName
    return ''
  }

  if (exeFileName !== '') {
    return exeFileName
  }

  switch (frameType) {
    case 0:
      return unsymbolizedFrameTitle

    case 1:
      return 'Python'

    case 2:
      return 'PHP'

    case 3:
      return 'Native'

    case 4:
      return 'Kernel'

    case 5:
      return 'JVM/Hotspot'

    case 6:
      return 'Ruby'

    case 7:
      return 'Perl'

    case 8:
      return 'JavaScript'

    default:
      return ''
  }
}
