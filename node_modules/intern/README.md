# ![Intern testing framework](https://theintern.github.io/intern/images/readme-logo.png)

[![Build Status](https://travis-ci.org/theintern/intern.png?branch=master)](https://travis-ci.org/theintern/intern)
[![Average time to resolve an issue](http://isitmaintained.com/badge/resolution/theintern/intern.svg)](http://isitmaintained.com/project/theintern/intern "Average time to resolve an issue")
[![Percentage of issues still open](http://isitmaintained.com/badge/open/theintern/intern.svg)](http://isitmaintained.com/project/theintern/intern "Percentage of issues still open")

Intern is a complete test system for JavaScript designed to help you write and run consistent, high-quality test
cases for your JavaScript libraries and applications. It can be used to test *any* JavaScript code. It can even be used
to test [non-JavaScript Web and mobile apps](https://theintern.github.io/intern/#native-apps), and to run tests written
for [other test systems](https://theintern.github.io/intern/#custom-interfaces).

If you’re into name-dropping, Intern gets used every day by teams at Twitter, Stripe, Mozilla, IBM, Marriott, Philips,
Zenput, Alfresco, Esri, HSBC, ING, Intuit, and more. It’s also the testing framework of choice for
[growing numbers of open-source projects](https://github.com/search?p=2&q=tests+filename%3Aintern.js&ref=searchresults&type=Code&utf8=%E2%9C%93).

Learn more about Intern at https://theintern.github.io.

## Quick start

1. Install from npm

   ```
   cd /my/project/root
   npm install intern --save-dev
   ```

2. Create a copy of the [example configuration file](https://github.com/theintern/intern/blob/master/tests/example.intern.js) in your package’s test directory and edit appropriately. See the
[configuration documentation](https://theintern.github.io/intern/#common-config) for a list of all available options.

   ```
   mkdir tests ; cp node_modules/intern/tests/example.intern.js tests/intern.js
   ```

3. Verify your configuration works by running the Node.js client and seeing that no errors are output.

   ```
   node_modules/.bin/intern-client config=tests/intern
   ```

4. Start writing tests! Read [writing tests](https://theintern.github.io/intern/#writing-unit-test) in the user guide
and the [Intern tutorial](https://github.com/theintern/intern-tutorial) to learn more!

## More information

* [Web site](https://theintern.github.io)
* [Documentation](https://theintern.github.io/intern)
* [Contributing/support](https://github.com/theintern/intern/blob/master/CONTRIBUTING.md)

## Do you hate kittens and love old IE?

If you need to support IE 6–8, there is also a
[version of Intern for legacy browsers](https://github.com/theintern/intern/tree/geezer "geezer branch").

## License

Intern is a Dojo Foundation project offered under the [New BSD](LICENSE) license.

© [SitePen, Inc.](http://sitepen.com) and its [contributors](https://github.com/theintern/intern/graphs/contributors)
