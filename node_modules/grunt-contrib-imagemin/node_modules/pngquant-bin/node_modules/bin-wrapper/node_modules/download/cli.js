#!/usr/bin/env node
'use strict';

var download = require('./');
var nopt = require('nopt');
var path = require('path');
var pkg = require('./package.json');
var stdin = require('get-stdin');
var url = require('get-urls');

/**
 * Options
 */

var opts = nopt({
    extract: Boolean,
    help: Boolean,
    out: String,
    strip: Number,
    version: Boolean
}, {
    e: '--extract',
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
    console.log('  $ download <url>');
    console.log('  $ cat <file> | download>');
    console.log('');
    console.log('Example');
    console.log('  $ download --out dist --extract https://github.com/kevva/download/archive/master.zip');
    console.log('  $ cat urls.txt | download --out dist');
    console.log('');
    console.log('Options');
    console.log('  -e, --extract           Extract archive files on download');
    console.log('  -o, --out               Path to download or extract the files to');
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
    var src = url(input.join(' '));

    if (src.length === 0) {
        console.error('Specify a URL');
        return;
    }

    download(src, opts.out, { extract: opts.extract, strip: opts.strip })
        .on('error', function (err) {
            throw err;
        })
        .on('close', function () {
            var m = src.length > 1 ? 'files' : 'file';
            console.log('Successfully downloaded ' + src.length, m + ' to ' + path.resolve(opts.out));
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
