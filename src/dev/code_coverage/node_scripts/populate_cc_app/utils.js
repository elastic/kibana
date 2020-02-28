export const pretty = x => JSON.stringify(x, null, 2);
export const pipe = (...fns) => fns.reduce((f, g) => (...args) => g(f(...args)));
