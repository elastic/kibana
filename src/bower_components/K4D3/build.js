{
    baseUrl: '.',
    name: 'lib/almond/almond',
    include: ['src/index'],
    optimize: 'none',
    out: 'build/k4.d3.js',
    onBuildRead: function(moduleName, path, contents) {
        return contents.replace(/console.log(.*);/g, '');
    },
    wrap: {
        startFile: 'src/start.js',
        endFile: 'src/end.js'
    }
}