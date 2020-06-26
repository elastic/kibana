/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

const sass = require('node-sass');
const postcss = require('postcss');
const postcssConfig = require('../../src/optimize/postcss.config');
const chokidar = require('chokidar');
const { debounce } = require('lodash');

const platform = require('os').platform();
const isPlatformWindows = /^win/.test(platform);

module.exports = function (grunt) {
  grunt.initConfig({
    clean: {
      target: ['target'],
    },
    copy: {
      makeProdBuild: {
        expand: true,
        src: [
          'components/**/*',
          'dist/**/*',
          'src/**/*',
          'package.json',
          '!**/*.test.js',
          '!**/__snapshots__/**/*',
        ],
        dest: 'target',
      },
    },
    babel: {
      prodBuild: {
        expand: true,
        src: ['target/components/**/*.js', 'target/src/**/*.js'],
        dest: '.',
        options: {
          presets: [require.resolve('@kbn/babel-preset/webpack_preset')],
        },
      },
    },
  });

  grunt.loadNpmTasks('grunt-babel');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.registerTask('prodBuild', ['clean:target', 'copy:makeProdBuild', 'babel:prodBuild']);

  grunt.registerTask('docSiteBuild', function () {
    const done = this.async();

    const serverCmd = {
      cmd: isPlatformWindows ? '.\\node_modules\\.bin\\webpack.cmd' : './node_modules/.bin/webpack',
      args: [
        '-p',
        '--config=doc_site/webpack.config.js',
        '--devtool=null', // Prevent the source map from being generated
      ],
      opts: { stdio: 'inherit' },
    };

    const uiFrameworkServerBuild = new Promise((resolve, reject) => {
      grunt.util.spawn(serverCmd, (error, result, code) => {
        if (error || code !== 0) {
          const message = result.stderr || result.stdout;

          grunt.log.error(message);

          return reject();
        }

        grunt.log.writeln(result);

        resolve();
      });
    });

    uiFrameworkServerBuild.then(done);
  });

  grunt.registerTask('docSiteStart', function () {
    const done = this.async();
    Promise.all([uiFrameworkWatch(), uiFrameworkServerStart()]).then(done);
  });

  grunt.registerTask('compileCssLight', function () {
    const done = this.async();
    uiFrameworkCompileLight().then(done);
  });

  grunt.registerTask('compileCssDark', function () {
    const done = this.async();
    uiFrameworkCompileDark().then(done);
  });

  function uiFrameworkServerStart() {
    const serverCmd = {
      cmd: isPlatformWindows
        ? '.\\node_modules\\.bin\\webpack-dev-server.cmd'
        : './node_modules/.bin/webpack-dev-server',
      args: [
        '--config=doc_site/webpack.config.js',
        '--hot',
        '--inline',
        '--content-base=doc_site/build',
        '--host=0.0.0.0',
        '--port=8020',
      ],
      opts: { stdio: 'inherit' },
    };

    return new Promise((resolve, reject) => {
      grunt.util.spawn(serverCmd, (error, result, code) => {
        if (error || code !== 0) {
          const message = result.stderr || result.stdout;

          grunt.log.error(message);

          return reject();
        }

        grunt.log.writeln(result);

        resolve();
      });
    });
  }

  function uiFrameworkCompileLight() {
    const src = 'src/kui_light.scss';
    const dest = 'dist/kui_light.css';

    return new Promise((resolve) => {
      sass.render(
        {
          file: src,
        },
        function (error, result) {
          if (error) {
            grunt.log.error(error);
          }

          postcss([postcssConfig])
            .process(result.css, { from: src, to: dest })
            .then((result) => {
              grunt.file.write(dest, result.css);

              if (result.map) {
                grunt.file.write(`${dest}.map`, result.map);
              }

              resolve();
            });
        }
      );
    });
  }

  function uiFrameworkCompileDark() {
    const src = 'src/kui_dark.scss';
    const dest = 'dist/kui_dark.css';

    return new Promise((resolve) => {
      sass.render(
        {
          file: src,
        },
        function (error, result) {
          if (error) {
            grunt.log.error(error);
          }

          postcss([postcssConfig])
            .process(result.css, { from: src, to: dest })
            .then((result) => {
              grunt.file.write(dest, result.css);

              if (result.map) {
                grunt.file.write(`${dest}.map`, result.map);
              }

              resolve();
            });
        }
      );
    });
  }

  function uiFrameworkWatch() {
    const debouncedCompile = debounce(
      () => {
        // Compile the SCSS in a separate process because node-sass throws a fatal error if it fails
        // to compile.
        grunt.util.spawn(
          {
            cmd: isPlatformWindows
              ? '.\\node_modules\\.bin\\grunt.cmd'
              : './node_modules/.bin/grunt',
            args: ['compileCssLight', 'compileCssDark'],
          },
          (error, result) => {
            if (error) {
              grunt.log.error(result.stdout);
            } else {
              grunt.log.writeln(result);
            }
          }
        );
      },
      400,
      { leading: true }
    );

    return new Promise(() => {
      debouncedCompile();

      chokidar.watch('src', { ignoreInitial: true }).on('all', (event, path) => {
        grunt.log.writeln(event, path);
        debouncedCompile();
      });
    });
  }
};
