export const getDefaultFormat = (format) => {
  const defaultFormat = Object.assign(Object.getPrototypeOf(format), format);
  defaultFormat.id = undefined;
  defaultFormat.resolvedTitle = defaultFormat.title;
  defaultFormat.title = '- Default -';
  return defaultFormat;
};
