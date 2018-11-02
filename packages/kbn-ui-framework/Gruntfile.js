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
      }
    },
    babel: {
      prodBuild: {
        expand: true,
        src: [
          'target/components/**/*.js',
          'target/src/**/*.js',
        ],
        dest: '.',
        options: {
          presets: [
            require.resolve('@kbn/babel-preset/webpack_preset')
          ]
        },
      }
    }
  });

  grunt.loadNpmTasks('grunt-babel');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.registerTask('prodBuild', ['clean:target', 'copy:makeProdBuild', 'babel:prodBuild']);

  grunt.registerTask('compileCss', async function () {
    const done = this.async();
    const src = 'src/index.scss';
    const dest = 'dist/ui_framework.css';

    try {
      const sassResult = sass.renderSync({
        file: src,
      });

      const postcssResult = await postcss([postcssConfig])
        .process(sassResult.css, {
          from: src,
          to: dest
        });

      grunt.file.write(dest, postcssResult.css);

      if (postcssResult.map) {
        grunt.file.write(`${dest}.map`, postcssResult.map);
      }

      done();
    } catch (error) {
      grunt.fail.fatal(error);
    }
  });
};
