var readline = require('readline');

module.exports = function (grunt) {

  grunt.registerTask('_release:confirmUpload', function () {
    var rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.on('close', this.async());
    rl.question('Do you want to actually upload the files to s3 after building?, [N/y] ', function (resp) {
      var debug = resp.toLowerCase().trim()[0] !== 'y';
      grunt.config.set('s3.release.options.dryRun', debug);
      rl.close();
    });
  });

  // collect the key and secret from the .aws-config.json file, finish configuring the s3 task
  grunt.registerTask('_release:loadS3Config', function () {
    var config = grunt.file.readJSON('.aws-config.json');
    grunt.config('s3.release.options.accessKeyId', config.key);
    grunt.config('s3.release.options.secretAccessKey', config.secret);
  });

  grunt.registerTask('release', [
    '_release:confirmUpload',
    '_release:loadS3Config',
    'build',
    's3:release'
  ]);

};
