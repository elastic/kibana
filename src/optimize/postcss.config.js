module.exports = {
  plugins: [
    require('autoprefixer')({
      browsers: [
        'last 2 versions',
        '> 5%',
        'Safari 7' // for PhantomJS support
      ]
    })
  ]
};
