// Karme IE Launcher
// =================

// Dependencies
// ------------

var fs = require('fs')
var urlparse = require('url').parse
var urlformat = require('url').format
var exec = require('child_process').exec
var _ = require('lodash')

// Constants
// ---------

var PROCESS_NAME = 'iexplore.exe'

// Find the ie executable
function getInternetExplorerExe () {
  var suffix = '\\Internet Explorer\\' + PROCESS_NAME
  var locations = _.map(_.compact([
    process.env['PROGRAMW6432'],
    process.env['PROGRAMFILES(X86)'],
    process.env['PROGRAMFILES']
  ]), function (prefix) {
    return prefix + suffix
  })

  return _.find(locations, function (location) {
    return fs.existsSync(location)
  })
}

// Constructor
function IEBrowser (baseBrowserDecorator, logger, args) {
  baseBrowserDecorator(this)

  var log = logger.create('launcher')
  var flags = args.flags || []

  // Handle x-ua-compatible option:
  //
  // Usage :
  //   customLaunchers: {
  //     IE9: {
  //       base: 'IE',
  //       'x-ua-compatible': 'IE=EmulateIE9'
  //     }
  //   }
  //
  // This is done by passing the option on the url, in response the Karma server will
  // set the following meta in the page.
  //   <meta http-equiv="X-UA-Compatible" content="[VALUE]"/>
  function handleXUaCompatible (args, urlObj) {
    if (args['x-ua-compatible']) {
      urlObj.query['x-ua-compatible'] = args['x-ua-compatible']
    }
  }

  // Spawning iexplore.exe spawns two processes (IE does that). The way karma kills the
  // browser process (hard kill) leaves the other process in memory.
  //
  // The second process is created using command-line args like this:
  //   "C:\Program Files\Internet Explorer\iexplore.exe" SCODEF:2632 CREDAT:275457 /prefetch:2
  // Where the SCODEF value is the pid of the 'original' process created by this launcher.
  //
  // This function kills any iexplore.exe process who's command line args match 'SCODEF:pid'.
  // On IE11 this will kill the extra process. On older versions, no process will be found.
  function killExtraIEProcess (pid, cb) {
    var scodef = 'SCODEF:' + pid

    // wmic.exe : http://msdn.microsoft.com/en-us/library/aa394531(v=vs.85).aspx
    var wmic = 'wmic.exe Path win32_Process ' +
      'where "Name=\'' + PROCESS_NAME + "' and " +
      "CommandLine Like '%" + scodef + '%\'" call Terminate'

    exec(wmic, function (err) {
      if (err) {
        log.error('Killing extra IE process failed. ' + err)
      } else {
        log.debug('Killed extra IE process ' + pid)
      }
      cb()
    })

  }

  this._getOptions = function (url) {
    var urlObj = urlparse(url, true)

    handleXUaCompatible(args, urlObj)

    // url.format does not want search attribute
    delete urlObj.search
    url = urlformat(urlObj)

    return flags.concat(url)
  }

  var baseOnProcessExit = this._onProcessExit
  this._onProcessExit = function (code, errorOutput) {
    var pid = this._process.pid
    killExtraIEProcess(pid, function () {
      if (baseOnProcessExit) {
        baseOnProcessExit(code, errorOutput)
      }
    })
  }

  // this is to expose the function for unit testing
  this._getInternetExplorerExe = getInternetExplorerExe
}

IEBrowser.prototype = {
  name: 'IE',
  DEFAULT_CMD: {
    win32: getInternetExplorerExe()
  },
  ENV_CMD: 'IE_BIN'
}

IEBrowser.$inject = ['baseBrowserDecorator', 'logger', 'args']

// Publish di module
// -----------------

module.exports = {
  'launcher:IE': ['type', IEBrowser]
}
