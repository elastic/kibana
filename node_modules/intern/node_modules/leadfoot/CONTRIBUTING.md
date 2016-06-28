Contribution guidelines
=======================

## Hi! Welcome!

Thanks for taking a look at our contribution guidelines. This is a small open-source project and we’re always looking
to get more people actively involved in its development and direction—even if you can’t send code!

## How to get help

In order to keep the GitHub issue tracker focused on development tasks, our team prefers that **questions be asked on
Stack Overflow or IRC instead of GitHub**. The [Getting help](https://theintern.github.io/intern/#getting-help) section
of the user guide goes into detail about where and how to ask questions to get the best response!

If you’re in a hurry, here are some direct links:

* [Post a question to Stack Overflow](http://stackoverflow.com/questions/ask?tags=intern)
* [Join #intern on Freenode](https://webchat.freenode.net/?channels=intern)

## Reporting bugs & feature requests

For bugs, please [open a ticket](https://github.com/theintern/leadfoot/issues/new?body=Description:%0A%0ASteps+to+reproduce:%0A%0A1.%20%E2%80%A6%0A2.%20%E2%80%A6%0A3.%20%E2%80%A6%0A%0AExpected%20result:%0AActual%20result:%0A%0AIntern%20version:%0A%0AAny%20additional%20information:),
providing a description of the problem, reproduction steps, expected result, and actual result. It’s very hard for us
to solve your problem without all of this information.

For feature requests, just open a ticket describing what you’d like to see and we’ll try to figure out how it can
happen! We (and all the other Intern users) would really appreciate it if you could also pitch in to actually implement
the feature (maybe with some help from us?).

It’s not that important, but if you can, try to post to the correct issue tracker for your problem:

* [Dig Dug](https://github.com/theintern/digdug/issues) should be used for issues regarding downloading or starting
  service tunnels, or interacting with a service provider’s REST API
* [Leadfoot](https://github.com/theintern/leadfoot/issues) should be used for issues with any of the functional
  testing APIs, including issues with cross-browser inconsistencies or unsupported Selenium environments
* [Intern](https://github.com/theintern/intern/issues) for all other issues

## Getting involved

Because Intern is a small project, *any* contribution you can make is much more impactful and much more appreciated
than anything you could offer to big OSS projects that are already well-funded by big corporations like Google or
Facebook.

If you want to get involved with the sexy, sexy world of testing software, but aren’t sure where to start, come
[talk to us on IRC](irc://irc.freenode.net/intern) or look through the list of
[help-wanted tickets](https://github.com/theintern/leadfoot/labels/help-wanted) for something that piques your interest.
The development team is always happy to provide guidance to new contributors!

If you’re not a coder (or you just don’t want to write code), we can still really use your help in other areas, like
improving [documentation](https://github.com/theintern/leadfoot/tree/gh-pages), or performing marketing and outreach, or
helping other users on Stack Overflow or IRC, so get in touch if you’d be willing to help in any way!

## Submitting pull requests

Like most open source projects, we require everyone to sign a
[contributor license agreement](http://dojofoundation.org/about/claForm) before we can accept any non-trivial
pull requests. This project belongs to the same foundation as other great OSS projects like Dojo, Grunt, lodash, and
RequireJS, so one e-signature makes you eligible to contribute to all of these projects!

Code should conform to our [code style guidelines](https://github.com/sitepen/.jshintrc). If possible and
appropriate, updated tests should also be a part of your pull request. (If you’re having trouble writing tests, we can
help you with them!)

## Advanced instructions for committers!

* Please make sure to provide rigorous code review on new contributions
* When in doubt, ask for a second review; don’t commit code that smells wrong just because it exists
* Squash pull requests into a single commit using `git rebase -i` after a merge. Don’t use the shiny green button!
  No merge commits allowed!
* Put `[ci skip]` at the end of commit messages for commits that do not modify any code (readme changes, etc.)
