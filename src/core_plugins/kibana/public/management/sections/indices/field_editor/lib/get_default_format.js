export const getDefaultFormat = (format) => {
  const defaultFormat = Object.assign(Object.getPrototypeOf(format), format);
  defaultFormat.id = undefined;
  defaultFormat.title = '- Default -';
  defaultFormat.resolvedName = defaultFormat.name;
  return defaultFormat;
};
