export default {
  name: 'boolean',
  from: {
    null: () => 0,
    number: (n) => Boolean(n),
    string: (s) => Boolean(s),
  },
  to: {
    string: (n) => String(n),
    number: (n) => Number(n),
  },
};
