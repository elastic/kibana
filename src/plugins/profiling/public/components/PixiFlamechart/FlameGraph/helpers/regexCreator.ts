export const safeRegexCreator = (pattern: string, flags?: string | undefined): RegExp | null => {
  try {
    return new RegExp(pattern.trim(), flags)
  } catch (err) {
    console.error('failed to create regex with pattern:', pattern)
    // in the future this could be handled by the UI and we could show a message to the user
    return null
  }
}