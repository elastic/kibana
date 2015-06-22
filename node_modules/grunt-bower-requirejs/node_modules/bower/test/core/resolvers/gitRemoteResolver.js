var expect = require('expect.js');
var path = require('path');
var fs = require('graceful-fs');
var Logger = require('bower-logger');
var GitRemoteResolver = require('../../../lib/core/resolvers/GitRemoteResolver');
var defaultConfig = require('../../../lib/config');

describe('GitRemoteResolver', function () {
    var testPackage = path.resolve(__dirname, '../../assets/package-a');
    var logger;

    before(function () {
        logger = new Logger();
    });

    afterEach(function () {
        logger.removeAllListeners();
    });

    function clearResolverRuntimeCache() {
        GitRemoteResolver.clearRuntimeCache();
    }

    function create(decEndpoint) {
        if (typeof decEndpoint === 'string') {
            decEndpoint = { source: decEndpoint };
        }

        return new GitRemoteResolver(decEndpoint, defaultConfig(), logger);
    }

    describe('.constructor', function () {
        it('should guess the name from the path', function () {
            var resolver;

            resolver = create('file://' + testPackage);
            expect(resolver.getName()).to.equal('package-a');

            resolver = create('git://github.com/twitter/bower.git');
            expect(resolver.getName()).to.equal('bower');

            resolver = create('git://github.com/twitter/bower');
            expect(resolver.getName()).to.equal('bower');

            resolver = create('git://github.com');
            expect(resolver.getName()).to.equal('github.com');
        });
    });

    describe('.resolve', function () {
        it('should checkout correctly if resolution is a branch', function (next) {
            var resolver = create({ source: 'file://' + testPackage, target: 'some-branch' });

            resolver.resolve()
            .then(function (dir) {
                expect(dir).to.be.a('string');

                var files = fs.readdirSync(dir);
                var fooContents;

                expect(files).to.contain('foo');
                expect(files).to.contain('baz');
                expect(files).to.contain('baz');

                fooContents = fs.readFileSync(path.join(dir, 'foo')).toString();
                expect(fooContents).to.equal('foo foo');

                next();
            })
            .done();
        });

        it('should checkout correctly if resolution is a tag', function (next) {
            var resolver = create({ source: 'file://' + testPackage, target: '~0.0.1' });

            resolver.resolve()
            .then(function (dir) {
                expect(dir).to.be.a('string');

                var files = fs.readdirSync(dir);

                expect(files).to.contain('foo');
                expect(files).to.contain('bar');
                expect(files).to.not.contain('baz');

                next();
            })
            .done();
        });

        it('should checkout correctly if resolution is a commit', function (next) {
            var resolver = create({ source: 'file://' + testPackage, target: 'bdf51ece75e20cf404e49286727b7e92d33e9ad0' });

            resolver.resolve()
            .then(function (dir) {
                expect(dir).to.be.a('string');

                var files = fs.readdirSync(dir);

                expect(files).to.not.contain('foo');
                expect(files).to.not.contain('bar');
                expect(files).to.not.contain('baz');
                expect(files).to.contain('.master');
                next();
            })
            .done();
        });

        it.skip('should handle gracefully servers that do not support --depth=1');
        it.skip('should report progress when it takes too long to clone');
    });

    describe('#refs', function () {
        afterEach(clearResolverRuntimeCache);

        it('should resolve to the references of the remote repository', function (next) {
            GitRemoteResolver.refs('file://' + testPackage)
            .then(function (refs) {
                // Remove master and test only for the first 7 refs
                refs = refs.slice(1, 8);

                expect(refs).to.eql([
                    'e4655d250f2a3f64ef2d712f25dafa60652bb93e refs/heads/some-branch',
                    '0a7daf646d4fd743b6ef701d63bdbe20eee422de refs/tags/0.0.1',
                    '0791865e6f4b88f69fc35167a09a6f0626627765 refs/tags/0.0.2',
                    '2af02ac6ddeaac1c2f4bead8d6287ce54269c039 refs/tags/0.1.0',
                    '6ab264f1ba5bafa80fb0198183493e4d5b20804a refs/tags/0.1.1',
                    'c91ed7facbb695510e3e1ab86bac8b5ac159f4f3 refs/tags/0.2.0',
                    '8556e55c65722a351ca5fdce4f1ebe83ec3f2365 refs/tags/0.2.1'
                ]);
                next();
            })
            .done();
        });

        it('should cache the results', function (next) {
            var source = 'file://' + testPackage;

            GitRemoteResolver.refs(source)
            .then(function () {
                // Manipulate the cache and check if it resolves for the cached ones
                GitRemoteResolver._cache.refs.get(source).splice(0, 1);

                // Check if it resolver to the same array
                return GitRemoteResolver.refs('file://' + testPackage);
            })
            .then(function (refs) {
                // Test only for the first 7 refs
                refs = refs.slice(0, 7);

                expect(refs).to.eql([
                    'e4655d250f2a3f64ef2d712f25dafa60652bb93e refs/heads/some-branch',
                    '0a7daf646d4fd743b6ef701d63bdbe20eee422de refs/tags/0.0.1',
                    '0791865e6f4b88f69fc35167a09a6f0626627765 refs/tags/0.0.2',
                    '2af02ac6ddeaac1c2f4bead8d6287ce54269c039 refs/tags/0.1.0',
                    '6ab264f1ba5bafa80fb0198183493e4d5b20804a refs/tags/0.1.1',
                    'c91ed7facbb695510e3e1ab86bac8b5ac159f4f3 refs/tags/0.2.0',
                    '8556e55c65722a351ca5fdce4f1ebe83ec3f2365 refs/tags/0.2.1'
                ]);
                next();
            })
            .done();
        });
    });
});
