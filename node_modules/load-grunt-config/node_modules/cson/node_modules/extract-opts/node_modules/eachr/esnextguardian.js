// 2015 December 8
// https://github.com/bevry/esnextguardian
'use strict'
module.exports = require('esnextguardian')(
    require('path').join(__dirname, 'esnext', 'lib', 'eachr.js'),
    require('path').join(__dirname, 'es5', 'lib', 'eachr.js'),
    require
)
