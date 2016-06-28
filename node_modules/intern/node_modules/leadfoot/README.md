# “Leadfoot drives browsers insanely fast”

Leadfoot is a JavaScript client library that brings cross-platform consistency to the Selenium WebDriver API.

Unlike existing WebDriver client libraries that assume the remote server will just do the Right Thing, Leadfoot detects
and works around inconsistencies in WebDriver server implementations, so you can just worry about making your tests
work—not bugs in WebDriver servers.

Enhanced capabilities are also exposed to end-users about which features and APIs a remote environment supports, so
you don’t have to browser sniff to decide whether (for example) you’re testing a touch-device or a mouse-device.
Optional convenience methods are also available for use, and support for chai-as-promised is built in.

Leadfoot is also the only WebDriver client library that includes an exhaustive unit test suite that verifies that
results are consistently returned from *all remote drivers*. Through this test suite we have discovered and reported
over 15 defects to upstream WebDriver server implementers.

Leadfoot currently detects and corrects known defects in the following remote drivers:

* InternetExplorerDriver 2.41.0+
* FirefoxDriver 2.41.0+
* ChromeDriver 2.9+
* SafariDriver 2.41.0+
* Selendroid 0.9.0+
* ios-driver 0.6.6+

Leadfoot is tested against IE8+ and all other modern browsers.

## Using Leadfoot

Leadfoot can be installed and used as a stand-alone WebDriver library from npm by running `npm install leadfoot`.
However, we recommend using Leadfoot through the [Intern testing framework](http://theintern.io), which provides you
with all of the tools you need to write robust unit and functional tests. Follow the instructions on
[writing functional tests with Intern](https://theintern.github.io/intern/#writing-functional-test)
to learn how to use Leadfoot with Intern.

## WD.js compatibility

A compatibility layer is provided to expose APIs that are signature-compatible with the variant of WD.js 0.2.2 used by
Intern 1. Use of these APIs will emit deprecation warnings. This compatibility layer will be removed in a future
release.

## API documentation

[View API documentation](https://theintern.github.io/leadfoot/)

## License

Leadfoot is a Dojo Foundation project offered under the [New BSD](LICENSE) license.

© [SitePen, Inc.](http://sitepen.com) and its [contributors](https://github.com/theintern/leadfoot/graphs/contributors)
