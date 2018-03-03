export function toContext(parent: string = '', child: string | number) {
  return parent ? `${parent}.${child}` : String(child);
}
