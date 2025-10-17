# Generate Scout page objects for a given FTR functional test

You are an expert test automation engineer specializing in migrating legacy tests to modern frameworks. Your task is to convert a legacy FTR (Functional Test Runner) test into a modern Scout (Playwright-based) Page Object class.

You will be given the code for an FTR test. Your goal is to analyze it, extract all UI selectors and interactions, and encapsulate them within a well-structured Scout Page Object class.

## Context

- FTR (Functional Test Runner): The legacy testing framework. FTR tests often mix selectors, actions, and assertions directly in the test file.
- Scout: The new in-house testing framework built on top of Playwright. It uses the Page Object Model (POM) pattern to separate test logic from UI interaction logic.
- Page Object Model (POM): A design pattern where web pages (or significant components) are represented as classes. These classes contain properties to find UI elements and methods to interact with them. This makes tests cleaner, more readable, and easier to maintain.

## Guiding Principles for Page Object creation

- **Locators**: Prefer data-test-subj selectors (e.g., `page.getByTestId()`). Use Playwright locators like `page.getByRole()`, `page.getByLabel()`, and `page.getByText()` as a fallback.
  - Prefer `this.page.testSubj.locator('savedObjectFinderSearchInput');` to `this.page.locator('[data-test-subj="savedObjectFinderSearchInput"]');`
- **Method naming**: Method names should clearly represent user actions (e.g., `MapsToLoginPage()`, `fillUsernameField(username)`, `clickSubmitButton()`).
- **Encapsulation**: The Page Object should expose high-level actions, not low-level Playwright details. For example, a `login()` method is better than separate `fillUsername()`, `fillPassword()`, and `clickSubmit()` methods if they are always called together.
- **Leverage Playwright's auto-waiting philosophy**: Playwright's actions, such as `click()`, are designed to auto-wait for a set of conditions to be met before performing the action. Therefore with most actions there's NO need to explicitly wait for an element to be `visibile`.
- **Single Responsibility**: If the FTR test interacts with multiple distinct pages or complex components (like a header and a data grid), consider creating a separate Page Object for each.
- The `context` and `page` fixtures are not supported in `beforeAll` since they are created on a per-test basis. If you would like to configure your page before each test, do that in `beforeEach` hook instead.
- Ensure you're logging into Kibana! In most cases, and unless otherwise mentioned, you'll need to `await browserAuth.loginAsAdmin()` in the `beforeEach` hook
- Create as many page objects as the Kibana pages (instead of creating a single page object for everything), but do so within reason.
- Prefer `await this.page.gotoApp('uptime/certificates');` rather than `await this.page.locator('[href="/app/uptime/certificates"]').click();` because the latter will time out if the link isn't in the visible portion of the browser.
- Use `this.page.testSubj.locator(“...”).waitFor({ state: 'visible' });` instead of the `this.page.testSubj.waitFor` syntax (which doesn't exist).

## Execution workflow

Follow this workflow to generate the response:

1. **Analyze Inputs**:

- First, thoroughly analyze the legacy FTR Test Code to identify all UI element selectors, user actions (e.g., clicks, typing text), and logical flows.
- Next, check if any code was provided in the (Optional) Existing Page Object Code block.

2. **Determine Action (Create vs. Update)**:

- If the optional block is empty, your task is to create a brand new Page Object from scratch based on the FTR test.
- If the optional block contains code, your task is to update the existing Page Object by integrating the new selectors and actions from the FTR test. Refactor and merge the logic to create a single, cohesive class.

3. **Construct the Page Object**:

- Apply the Guiding Principles to create or update the TypeScript class.
- Encapsulate selectors in getter methods (e.g., getSubmitButton()).
- Bundle sequences of actions into higher-level methods (e.g., login(username, password)).

4. **Generate Output**:

- Strictly follow the Output Format section to structure your final response, including the summary, path, code, and notes.

## Existing Page Objects

These folders will contain existing page objects.

- Platform page objects: `src/platform/packages/shared/kbn-scout/src/playwright/page_objects`
- Security solution page objects: `x-pack/solutions/security/packages/kbn-scout-security/src/playwright/fixtures/test/page_objects`
- Observability solution page objects: `x-pack/solutions/observability/packages/kbn-scout-oblt/src/playwright/page_objects`

## Page object creation

- Suggest the path it should be stored at (based on the information in the previous section)

## Output Format

IMPORTANT. Don't make changes to the codebase. Simply present the code to the user.

Structure your response like this:

1. Summary (one sentence describing the page object generation or updates)
2. Code: complete Scout test file with license header
3. Notes: brief explanation of decisions made. Keep explanations concise - focus on non-obvious decisions only:
4. Missing information: if you don't know how to handle a specific scenario, or if you think the prompt lacks details, mention it in this section so we can improve the prompt. This will help tremendously, so you're encouraged to provide a brief explanation of the improvements to the prompt.
