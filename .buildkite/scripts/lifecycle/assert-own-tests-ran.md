# Assert that our modified test(s) actually ran in CI

It'd be nice if ci told us if our tests actually ran

First we need to run this check on a completed ci run.
Probably means running this within `.buildkite/scripts/lifecycle/post_build.sh`

Next, we need to know which of our committed files are actually tests

Then, we need to take that list of tests and find their config(s).

Then, we need to somehow interrogate the ci output to see if our committed test's config(s) ran

Finally, we need to at least print that out in the log

> Optionally, we could report that status back to the ci metadata

> Optionally, we could report that status back to the pr


## Some Constraints

Of note, pull request ci jobs and code coverage ci jobs 
are currently different since the code coverage ci job
does not run any ftr configs.

So, does that mean we only run this check on pull request jobs?  **Probably!**
