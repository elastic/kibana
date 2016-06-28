#!/usr/bin/env node
'use strict';

var decompress = require('./');
var extname = require('extname');
var fs = require('fs');
var nopt = require('nopt');
var pkg = require('./package.json');
var stdin = require('get-stdin');

/**
 * Options
 */

var opts = nopt({
    help: Boolean,
    out: String,
    strip: Number,
    version: Boolean
}, {
    h: '--help',
    o: '--out',
    s: '--strip',
    v: '--version'
});

/**
 * Help screen
 */

function help() {
    console.log(pkg.description);
    console.log('');
    console.log('Usage');
    console.log('  $ decompress <file>');
    console.log('  $ cat <file> | decompress');
    console.log('');
    console.log('Example');
    console.log('  $ decompress --out dist --strip 1 archive.zip');
    console.log('  $ cat files.txt | decompress --out dist');
    console.log('');
    console.log('Options');
    console.log('  -o, --out <path>        Path to extract the archive to');
    console.log('  -s, --strip <number>    Strip path segments from root when extracting');
}

/**
 * Show help
 */

if (opts.help) {
    help();
    return;
}

/**
 * Show package version
 */

if (opts.version) {
    console.log(pkg.version);
    return;
}

/**
 * Run
 */

function run(input) {
    var src = input;
    var dest = opts.out || process.cwd();
    var ext = '.' + extname(src).ext;

    src.forEach(function (s) {
        fs.createReadStream(s).pipe(decompress({ ext: ext, path: dest, strip: opts.strip }));
    });
}

/**
 * Apply arguments
 */

if (process.stdin.isTTY) {
    var input = opts.argv.remain;
    run(input);
} else {
    stdin(function (data) {
        var input = opts.argv.remain;
        [].push.apply(input, data.trim().split('\n'));
        run(input);
    });
}
