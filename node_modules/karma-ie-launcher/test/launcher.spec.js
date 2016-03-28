var di = require('di')
var mocks = require('mocks')

describe('launcher', function () {
  var EventEmitter, IELauncher, injector, launcher, module

  beforeEach(function () {
    EventEmitter = require('../node_modules/karma/lib/events').EventEmitter
    IELauncher = mocks.loadFile(__dirname + '/../index').module.exports
    module = {
      baseBrowserDecorator: ['value', function () {}],
      emitter: ['value', new EventEmitter()],
      logger: [
        'value', {
          create: function () {
            return {
              error: function () {},
              debug: function () {}
            }
          }
        }
      ],
      args: ['value', []]
    }
  })

  afterEach(function () {
    injector = null
    launcher = null
  })

  describe('exports', function () {
    it('should export launcher:IE', function (done) {
      expect(IELauncher['launcher:IE']).to.defined
      done()
    })
  })

  describe('initialization', function () {
    beforeEach(function () {
      injector = new di.Injector([module, IELauncher])
      launcher = injector.get('launcher:IE')
    })

    it('should initialize name', function (done) {
      expect(launcher.name).to.equal('IE')
      done()
    })

    it('should initialize ENV_CMD', function (done) {
      expect(launcher.ENV_CMD).to.equal('IE_BIN')
      done()
    })

    it('should initialize DEFAULT_CMD.win32', function (done) {
      expect(launcher.DEFAULT_CMD.win32).to.beDefined
      done()
    })
  })

  describe('_getOptions', function () {
    var getOptions

    beforeEach(function () {
      getOptions = function (url, module) {
        injector = new di.Injector([module, IELauncher])
        launcher = injector.get('launcher:IE')
        return launcher._getOptions('url')
      }
    })

    it('should include args.flags', function (done) {
      var options
      module.args[1] = {
        flags: ['-flag1', '-flag2']
      }
      options = getOptions('url', module)
      expect(options[0]).to.equal('-flag1')
      expect(options[1]).to.equal('-flag2')
      done()
    })

    it('should return url as the last flag', function (done) {
      var options = getOptions('url', module)
      expect(options[options.length - 1]).to.equal('url')
      done()
    })

    it('should convert x-ua-compatible arg to encoded url', function (done) {
      module.args[1] = {
        'x-ua-compatible': 'browser=mode'
      }
      var options = getOptions('url', module)
      expect(options[options.length - 1]).to.equal('url?x-ua-compatible=browser%3Dmode')
      done()
    })
  })

  describe('locating iexplore.exe', function () {
    var fsMock, win32Location

    beforeEach(function () {
      process.env['PROGRAMW6432'] = '\\fake\\PROGRAMW6432'
      process.env['PROGRAMFILES(X86)'] = '\\fake\\PROGRAMFILES(X86)'
      process.env['PROGRAMFILES'] = '\\fake\\PROGRAMFILES'
      fsMock = mocks.fs.create({
        'folder1': {
          'Internet Explorer': {
            'iexplore.exe': 1
          }
        }
      })

      IELauncher = mocks.loadFile(__dirname + '/../index', {
        fs: fsMock
      }).module.exports

      win32Location = function () {
        injector = new di.Injector([module, IELauncher])
        launcher = injector.get('launcher:IE')
        return launcher._getInternetExplorerExe()
      }
    })

    it('should locate in PROGRAMW6432', function (done) {
      process.env['' + 'PROGRAMW6432'] = '\\folder1'
      expect(win32Location()).to.equal('\\folder1\\Internet Explorer\\iexplore.exe')
      done()
    })

    it('should locate in PROGRAMFILES(X86)', function (done) {
      process.env['' + 'PROGRAMFILES(X86)'] = '\\folder1'
      expect(win32Location()).to.equal('\\folder1\\Internet Explorer\\iexplore.exe')
      done()
    })

    it('should locate in PROGRAMFILES', function (done) {
      process.env['' + 'PROGRAMFILES'] = '\\folder1'
      expect(win32Location()).to.equal('\\folder1\\Internet Explorer\\iexplore.exe')
      done()
    })

    it('should return undefined when not found', function (done) {
      expect(win32Location()).to.equal(void 0)
      done()
    })
  })

  describe('_onProcessExit', function () {
    var child_processCmd, onProcessExit

    beforeEach(function () {
      onProcessExit = function () {
        var child_processMock
        child_processMock = {
          exec: function (cmd, cb) {
            child_processCmd = cmd
            cb()
          }
        }

        IELauncher = mocks.loadFile(__dirname + '/../index', {
          child_process: child_processMock
        }).module.exports
        injector = new di.Injector([module, IELauncher])
        launcher = injector.get('launcher:IE')
        launcher._process = {
          pid: 10
        }
        launcher._onProcessExit(1, 2)
      }
    })

    it('should call wmic with process ID', function (done) {
      onProcessExit()
      expect(child_processCmd).to.equal(
        'wmic.exe Path win32_Process where ' +
        '"Name=\'iexplore.exe\' and CommandLine Like \'%SCODEF:10%\'" call Terminate'
      )
      done()
    })
  })
})
