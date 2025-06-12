---
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/development-pull-request.html
---

# Submitting a pull request [development-pull-request]


## What Goes Into a Pull Request [_what_goes_into_a_pull_request]

* Please include an explanation of your changes in your PR description.
* Links to relevant issues, external resources, or related PRs are very important and useful.
* Please update any tests that pertain to your code, and add new tests where appropriate.
* Update or add docs when appropriate. Read more about [Documentation during development](/extend/development-documentation.md).


## Submitting a Pull Request [_submitting_a_pull_request]

1. Push your local changes to your forked copy of the repository and submit a pull request.
2. Describe what your changes do and mention the number of the issue where discussion has taken place, e.g., “Closes #123″.
3. Assign the `review` and `💝community` label (assuming you are not a member of the Elastic organization). This signals to the team that someone needs to give this attention.
4. Do **not** assign a version label. Someone from Elastic staff will assign a version label, if necessary, when your Pull Request is ready to be merged.
5. If you would like someone specific to review your pull request, assign them. Otherwise an Elastic staff member will assign the appropriate person.

Always submit your pull against master unless the bug is only present in an older version. If the bug affects both master and another branch say so in your pull.

Then sit back and wait. There will probably be discussion about the Pull Request and, if any changes are needed, we’ll work with you to get your Pull Request merged into {{kib}}.


## What to expect during the pull request review process [_what_to_expect_during_the_pull_request_review_process]

Most PRs go through several iterations of feedback and updates. Depending on the scope and complexity of the PR, the process can take weeks. Please be patient and understand we hold our code base to a high standard.

Check out our [Pull request review guidelines](/extend/pr-review.md) for our general philosophy for pull request reviews.

