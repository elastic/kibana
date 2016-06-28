Contribution guidelines
=======================

## Hi!

* The issues tab is for **bugs and feature enhancement requests only**, not questions. If you aren’t sure if your
  problem is a bug (or you know that it isn’t), please ask in one of the
  [support forums](https://github.com/theintern/intern/wiki/Support) instead. Any help questions posted to the bug
  tracker will normally be closed without a good answer in order to keep the bug tracker focused only on the development
  process. Sorry for any inconvenience!
* If you can, find the right issue tracker for your problem:
  * [Dig Dug](https://github.com/theintern/digdug/issues) should be used for issues regarding downloading or starting
    service tunnels, or interacting with a service provider’s REST API
  * [Leadfoot](https://github.com/theintern/leadfoot/issues) should be used for issues with any of the functional
    testing APIs, including issues with cross-browser inconsistencies or unsupported Selenium environments
  * [Intern](https://github.com/theintern/intern/issues) for all other issues

## Want to submit a new feature or bug fix?

* Thank you for your contribution!
* If you want to help, but aren’t sure where to start, come [talk to us on IRC](irc://irc.freenode.net/intern) or ask
  how to start on a ticket that interests you
* You should also talk to us if you are working on a big thing so we can coordinate before you spend a lot of time on it
  :)
* Please make sure you sign a [Dojo Foundation CLA](http://dojofoundation.org/about/claForm) or we cannot accept your
  code
* Code should conform to our [code style guidelines](https://github.com/sitepen/.jshintrc)
* If possible and appropriate, updated tests should be a part of your pull request

## Committers!

* Please make sure to provide rigorous code review on new contributions
* When in doubt, ask for a second review; don’t commit code that smells wrong just because it exists
* Squash all pull requests into a single commit by using `git rebase -i` after a merge. Don’t use the shiny green
  button!
* Put `[ci skip]` at the end of commit messages for commits that do not modify any code (readme changes, etc.)
* (Intern only) After committing to master, always checkout `geezer` and `git merge master` if the code applies to both
  branches
