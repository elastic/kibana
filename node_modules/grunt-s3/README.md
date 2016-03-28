[![Build Status](https://secure.travis-ci.org/pifantastic/grunt-s3.png?branch=master)](https://travis-ci.org/pifantastic/grunt-s3)

*NOTE*: This is the README for `grunt-s3` `v0.2.0-alpha`. For `v0.1.0`, [go here](https://github.com/pifantastic/grunt-s3/blob/0.1.X/README.md).

# Grunt 0.4.x + Amazon S3

## About

Amazon S3 is a great tool for storing/serving data. Thus, there is a chance it is part of your build
process. This task can help you automate uploading/downloading files to/from Amazon S3. All file
transfers are verified and will produce errors if incomplete.

## Dependencies

* knox
* mime
* async
* underscore
* underscore.deferred

## Installation

```sh
npm install grunt-s3 --save-dev
```

Then add this line to your project's `Gruntfile.js`:

```javascript
grunt.loadNpmTasks('grunt-s3');
```

## Options

The grunt-s3 task is now a [multi-task](https://github.com/gruntjs/grunt/wiki/Creating-tasks); meaning you can specify different targets for this task to run as.

A quick reference of options

* **key** - (*string*) An Amazon S3 credentials key
* **secret** - (*string*) An Amazon S3 credentials secret
* **bucket** - (*string*) An Amazon S3 bucket
* **region** - (*string*) An Amazon AWS region (see http://docs.aws.amazon.com/general/latest/gr/rande.html#s3_region)
* **maxOperations** - (*number*) max number of concurrent transfers - if not specified or set to 0, will be unlimited.
* **encodePaths** - (*boolean*) if set to true, will encode the uris of destinations to prevent 505 errors. Default: false
* **headers** - (*object*) An object containing any headers you would like to send along with the
transfers i.e. `{ 'X-Awesomeness': 'Out-Of-This-World', 'X-Stuff': 'And Things!' }`
* **access** - (*string*) A specific Amazon S3 ACL. Available values: `private`, `public-read`, `
public-read-write`, `authenticated-read`, `bucket-owner-read`, `bucket-owner-full-control`
* **gzip** - (*boolean*) If true, uploads will be gzip-encoded.
* **gzipExclude** - (*array*) Define extensions of files you don't want to run gzip on, an array of strings ie: `['.jpg', '.jpeg', '.png']`.
* **upload** - (*array*) An array of objects, each object representing a file upload and containing a `src`
and a `dest`. Any of the above values may also be overriden. Passing `rel:DIR` will cause the filesnames to be
expanded so that wild cards are not passed to the source name.
* **download** - (*array*) An array of objects, each object representing a file download and containing a
`src` and a `dest`. Any of the above values may also be overriden.
* **del** - (*array*) An array of objects, each object containing a `src` to delete from s3. Any of
the above values may also be overriden.
* **sync** - (*array*) An array of ojects, each oject containing a `src` and `dest`. Default behavior is to
only upload new files (that don't exist). Adding `verify:true` forces an MD5 hash and Modified time check prior
to overwriting the server files.
* **debug** - (*boolean*) If true, no transfers with S3 will occur, will print all actions for review by user

### Example

Template strings in grunt will allow you to easily include values from other files. The below example
demonstrates loading aws settings from another file, Where grunt-aws.json is just a json key:value file like package.json. (Special thanks to @nanek)

This is **important because you should never check in your S3 credentials to github! Load them from an external file that is outside of the repo.**

```javascript
grunt.initConfig({
  aws: grunt.file.readJSON('~/grunt-aws.json'),
  s3: {
    options: {
      key: '<%= aws.key %>',
      secret: '<%= aws.secret %>',
      bucket: '<%= aws.bucket %>',
      access: 'public-read',
      headers: {
        // Two Year cache policy (1000 * 60 * 60 * 24 * 730)
        "Cache-Control": "max-age=630720000, public",
        "Expires": new Date(Date.now() + 63072000000).toUTCString()
      }
    },
    dev: {
      // These options override the defaults
      options: {
        encodePaths: true,
        maxOperations: 20
      },
      // Files to be uploaded.
      upload: [
        {
          src: 'important_document.txt',
          dest: 'documents/important.txt',
          options: { gzip: true }
        },
        {
          src: 'passwords.txt',
          dest: 'documents/ignore.txt',

          // These values will override the above settings.
          bucket: 'some-specific-bucket',
          access: 'authenticated-read'
        },
        {
          // Wildcards are valid *for uploads only* until I figure out a good implementation
          // for downloads.
          src: 'documents/*.txt',

          // But if you use wildcards, make sure your destination is a directory.
          dest: 'documents/'
        }
      ],

      // Files to be downloaded.
      download: [
        {
          src: 'documents/important.txt',
          dest: 'important_document_download.txt'
        },
        {
          src: 'garbage/IGNORE.txt',
          dest: 'passwords_download.txt'
        }
      ],

      del: [
        {
          src: 'documents/launch_codes.txt'
        },
        {
          src: 'documents/backup_plan.txt'
        }
      ],

      sync: [
        {
          // only upload this document if it does not exist already
          src: 'important_document.txt',
          dest: 'documents/important.txt',
          options: { gzip: true }
        },
        {
          // make sure this document is newer than the one on S3 and replace it
          verify: true,
          src: 'passwords.txt',
          dest: 'documents/ignore.txt'
        },
        {
          src: path.join(variable.to.release, "build/cdn/js/**/*.js"),
          dest: "jsgz",
          // make sure the wildcard paths are fully expanded in the dest
          rel: path.join(variable.to.release, "build/cdn/js"),
          options: { gzip: true }
        }
      ]
    }

  }

});
```

Running `grunt s3` using the above config produces the following output:

    $ grunt s3
    Running "s3" task
    >> ↙ Downloaded: documents/important.txt (e704f1f4bec2d17f09a0e08fecc6cada)
    >> ↙ Downloaded: garbage/IGNORE.txt (04f7cb4c893b2700e4fa8787769508e8)
    >> ↗ Uploaded: documents/document1.txt (04f7cb4c893b2700e4fa8787769508e8)
    >> ↗ Uploaded: passwords.txt (04f7cb4c893b2700e4fa8787769508e8)
    >> ↗ Uploaded: important_document.txt (e704f1f4bec2d17f09a0e08fecc6cada)
    >> ↗ Uploaded: documents/document2.txt (04f7cb4c893b2700e4fa8787769508e8)
    >> ✗ Deleted: documents/launch_codes.txt
    >> ✗ Deleted: documents/backup_plan.txt
    Done, without errors.

### Alternative ways of including your s3 configuration

#### Environment variables

If you do not pass in a **key** and **secret** with your config, `grunt-s3` will fallback to the following
environment variables:

* `AWS_ACCESS_KEY_ID`
* `AWS_SECRET_ACCESS_KEY`

## Helpers

Helpers have been removed from Grunt 0.4 to access these methods directly. You can now require the s3 library files directly like so:

`var s3 = require('grunt-s3').helpers;`

Make sure you explicitly pass the options into the method. If you've used `grunt.initConfig()` you can use `grunt.config.get('s3')` to access them.

### s3.upload(src, dest, options)

Upload a file to s3. Returns a Promises/J-style Deferred object.

**src** (required) - The path to the file to be uploaded. Accepts wildcards, i.e. `files/*.txt`

**dest** (required) - The path on s3 where the file will be uploaded, relative to the bucket. If you use a
wildcard for **src**, this should be a directory.

**options** (optional) - An object containing any of the following values. These values override
any values specified in the main config.

* **key** - An Amazon S3 credentials key
* **secret** - An Amazon S3 credentials secret
* **bucket** - An Amazon S3 bucket
* **headers** - An object containing any headers you would like to send along with the upload.
* **access** - A specific Amazon S3 ACL. Available values: `private`, `public-read`, `public-read-write`,
`authenticated-read`, `bucket-owner-read`, `bucket-owner-full-control`
* **gzip** - (*boolean*) If true, uploads will be gzip-encoded.

### s3.download(src, dest, options)
Download a file from s3. Returns a Promises/J-style Deferred object.

**src** (required) - The path on S3 from which the file will be downloaded, relative to the bucket. **Does not accept wildcards**

**dest** (required) - The local path where the file will be saved.

**options** (optional) - An object containing any of the following values. These values override
any values specified in the main config.

* **key** - An Amazon S3 credentials key
* **secret** - An Amazon S3 credentials secret
* **bucket** - An Amazon S3 bucket
* **headers** - An object containing any headers you would like to send along with the upload.

### s3.delete(src, options)

Delete a file from s3. Returns a Promises/J-style Deferred object.

**src** (required) - The path on S3 of the file to delete, relative to the bucket. **Does not accept wildcards**

**options** (optional) - An object containing any of the following values. These values override
any values specified in the main config.

* **key** - An Amazon S3 credentials key
* **secret** - An Amazon S3 credentials secret
* **bucket** - An Amazon S3 bucket
* **headers** - An object containing any headers you would like to send along with the upload.

### Examples

```javascript
var upload = s3.upload('dist/my-app-1.0.0.tar.gz', 'archive/my-app-1.0.0.tar.gz');

upload
  .done(function(msg) {
    console.log(msg);
  })
  .fail(function(err) {
    console.log(err);
  })
  .always(function() {
    console.log('dance!');
  });

var download = s3.download('dist/my-app-0.9.9.tar.gz', 'local/my-app-0.9.9.tar.gz');

download.done(function() {
  s3.delete('dist/my-app-0.9.9.tar.gz');
});

```

## Changelog

#### v0.1.0

* Update to be compatible with `grunt` version `0.4.x`.

#### v0.0.9

* Bump version of `knox` to `0.4.1`.

#### v0.0.6

* Bump version of `underscore.deferred` to `0.1.4`. Version `0.1.3` would fail to install sometimes
due to there being two versions of the module with different capitalizations in npm.
