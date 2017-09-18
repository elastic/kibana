module.exports = {
  presets: [
    require.resolve('babel-preset-react'),
  ],
  plugins: [
    require.resolve('babel-plugin-add-module-exports'),
    // stage 3
    require.resolve('babel-plugin-transform-async-generator-functions'),
    require.resolve('babel-plugin-transform-object-rest-spread'),

    // the class properties proposal was merged with the private fields proposal
    // into the "class fields" proposal. Babel doesn't support this combined
    // proposal yet, which includes private field, so this transform is
    // TECHNICALLY stage 2, but for all intents and purposes it's stage 3
    //
    // See https://github.com/babel/proposals/issues/12 for progress
    require.resolve('babel-plugin-transform-class-properties'),
  ],
};
