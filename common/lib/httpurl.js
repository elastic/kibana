// A cheap regex to distinguish an HTTP URL string from a data URL string
const httpurlRegex = /^https?:\/\/\S+(?:[0-9]+)?\/\S{1,}/;

export function isValid(str) {
  return httpurlRegex.test(str);
}
