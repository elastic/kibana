module.exports = function (grunt) {
  require('jit-grunt')(grunt, {
    s3: 'grunt-aws',
    eslint: 'gruntify-eslint'
  });

  const srcFiles = [
    {
      expand: true,
      src: [
        'public/**',
        '!public/tests/**',
        'api_server/**',
        'index.js',
        'LICENSE.md',
        'package.json',
        'README.md',
      ],
      dest: 'build/sense-<%= pkg.version %>'
    }
  ];

  grunt.initConfig({
    pkg: require('./package.json'),

    clean: {
      build: { src: 'build' },
      target: { src: 'target' },
    },

    compress: {
      build: {
        options: {
          mode: 'tgz',
          archive: 'target/sense-<%= pkg.version %>.tar.gz'
        },
        files: [
          {
            expand: true,
            cwd: 'build/',
            src: ['**'],
            dest: ''
          },
        ]
      }
    },

    copy: {
      build: {
        files: srcFiles
      }
    },

    s3: {
      release: {
        options: {
          bucket: 'download.elasticsearch.org',
          access: 'private',
          gzip: false
        },
        files: [
          {
            src: 'target/sense-<%= pkg.version %>.tar.gz',
            dest: 'elasticsearch/sense/sense-<%= pkg.version %>.tar.gz'
          }
        ]
      }
    },

    eslint: {
      source: {
        src: [
          'public/**/*.js',
          '!**/webpackShims/**'
        ]
      }
    },

    gitinfo: {},

    replace: {
      build: {
        options: {
          patterns: [
            {
              match: 'SENSE_REVISION',
              replacement: '<%= gitinfo.local.branch.current.SHA %>'
            }
          ]
        },
        files: srcFiles
      }
    }
  });

  require('./tasks/build')(grunt);
  require('./tasks/release')(grunt);
};
