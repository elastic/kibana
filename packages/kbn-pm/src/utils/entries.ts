export function entries<T>(obj: { [s: string]: T }): [string, T][] {
  const ownProps = Object.keys(obj);
  const result = new Array();
  for (let i = 0; i < ownProps.length; i++) {
    result[i] = [ownProps[i], obj[ownProps[i]]];
  }
  return result;
}
