export const unquoteString = str => {
  if (/^"/.test(str)) return str.replace(/^"(.+(?="$))"$/, '$1');
  if (/^'/.test(str)) return str.replace(/^'(.+(?='$))'$/, '$1');
  return str;
};
