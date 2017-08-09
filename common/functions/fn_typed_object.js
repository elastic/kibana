import Fn from './fn';

// This creates a function with no logic whose only purpose is to return an object with 'type' set to the same
// name as the function, and the passed arguments as its contents
export default function FnTypedObject({ name, aliases, help, args }) {
  return new Fn({
    name, aliases, help, args,
    type: name,
    fn: (context, args) => ({ type: name, ...args }),
  });
}
