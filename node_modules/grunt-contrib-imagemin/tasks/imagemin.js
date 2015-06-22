/*
 * grunt-contrib-imagemin
 * http://gruntjs.com/
 *
 * Copyright (c) 2012 Sindre Sorhus, contributors
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function (grunt) {
    var path = require('path');
    var fs = require('fs');
    var os = require('os');
    var crypto = require('crypto');
    var childProcess = require('child_process');
    var filesize = require('filesize');
    var chalk = require('chalk');
    var optipngPath = require('optipng-bin').path;
    var pngquantPath = require('pngquant-bin').path;
    var jpegtranPath = require('jpegtran-bin').path;
    var gifsiclePath = require('gifsicle').path;
    var numCPUs = os.cpus().length;
    var tmpdir = os.tmpdir ? os.tmpdir() : os.tmpDir();
    var cacheDir = path.join(tmpdir, 'grunt-contrib-imagemin.cache');

    function hashFile(filePath) {
        var content = grunt.file.read(filePath);
        return crypto.createHash('sha1').update(content).digest('hex');
    }

    grunt.registerMultiTask('imagemin', 'Minify PNG and JPEG images', function () {
        var done = this.async();
        var options = this.options({
            optimizationLevel: 7,
            progressive: true,
            pngquant: true
        });
        var optipngArgs = ['-strip', 'all'];
        var pngquantArgs = ['-'];
        var jpegtranArgs = ['-copy', 'none', '-optimize'];
        var gifsicleArgs = ['-w'];
        var totalSaved = 0;

        if (typeof options.optimizationLevel === 'number') {
            optipngArgs.push('-o', options.optimizationLevel);
        }

        if (options.progressive === true) {
            jpegtranArgs.push('-progressive');
        }

        if (options.interlaced === true) {
            gifsicleArgs.push('--interlace');
        }

        grunt.verbose.writeflags(options, 'Options');

        grunt.util.async.forEachLimit(this.files, numCPUs, function (file, next) {
            optimize(file.src[0], file.dest, next);
        }.bind(this), function (err) {
            if (err) {
                grunt.warn(err);
            }

            grunt.log.writeln('Minified ' + this.files.length + ' ' +
                (this.files.length === 1 ? 'image' : 'images') +
                chalk.gray(' (saved '  + filesize(totalSaved) + ')'));
            done();
        }.bind(this));

        function optimize(src, dest, next) {
            var cp;
            var originalSize = fs.statSync(src).size;
            var cachePath = path.join(cacheDir, hashFile(src));

            function processed(err, result, code) {
                var saved, savedMsg;

                if (err) {
                    grunt.log.writeln(err);
                }

                saved = originalSize - fs.statSync(dest).size;
                totalSaved += saved;

                if (result && (result.stderr.indexOf('already optimized') !== -1 || saved < 10)) {
                    savedMsg = 'already optimized';
                } else {
                    savedMsg = 'saved ' + filesize(saved);
                }

                if (!grunt.file.exists(cachePath)) {
                    grunt.file.copy(dest, cachePath);

                    if (grunt.option('verbose')) {
                        grunt.log.writeln('[caching] ' + src + ' → ' + cachePath);
                    }
                }

                grunt.log.writeln(chalk.green('✔ ') + src + chalk.gray(' (' + savedMsg + ')'));
                next();
            }

            grunt.file.mkdir(path.dirname(dest));

            if (grunt.file.exists(cachePath)) {
                if (grunt.option('verbose')) {
                    grunt.log.writeln('[cached] ' + src + ' ← ' + cachePath);
                }

                grunt.file.copy(cachePath, dest);
                processed();
            } else if (path.extname(src).toLowerCase() === '.png') {
                if (options.pngquant) {
                    var tmpDest = dest + '.tmp';

                    cp = grunt.util.spawn({
                        cmd: pngquantPath,
                        args: pngquantArgs
                    }, function () {
                        if (grunt.file.exists(dest)) {
                            grunt.file.delete(dest);
                        }

                        grunt.util.spawn({
                            cmd: optipngPath,
                            args: optipngArgs.concat(['-out', dest, tmpDest])
                        }, function () {
                            grunt.file.delete(tmpDest);
                            processed();
                        });
                    });

                    cp.stdout.pipe(fs.createWriteStream(tmpDest));
                    fs.createReadStream(src).pipe(cp.stdin);
                } else {
                    if (dest !== src && grunt.file.exists(dest)) {
                        grunt.file.delete(dest);
                    }

                    cp = grunt.util.spawn({
                        cmd: optipngPath,
                        args: optipngArgs.concat(['-out', dest, src])
                    }, processed);
                }
            } else if (['.jpg', '.jpeg'].indexOf(path.extname(src).toLowerCase()) !== -1) {
                cp = grunt.util.spawn({
                    cmd: jpegtranPath,
                    args: jpegtranArgs.concat(['-outfile', dest, src])
                }, processed);
            } else if (path.extname(src).toLowerCase() === '.gif') {
                cp = grunt.util.spawn({
                    cmd: gifsiclePath,
                    args: gifsicleArgs.concat(['-o', dest, src])
                }, processed);
            } else {
                next();
            }

            if (cp && grunt.option('verbose')) {
                cp.stdout.pipe(process.stdout);
                cp.stderr.pipe(process.stderr);
            }
        }
    });
};
