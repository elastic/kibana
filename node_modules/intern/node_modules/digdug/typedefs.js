/**
 * Data that can be passed to tunnel providers to update the state of a job being executed on their service.
 * @typedef {Object} JobState
 *
 * @property {number=} buildId
 * The build number of the software being tested by the job. Supported by Sauce Labs.
 *
 * @property {Object=} extra
 * Additional arbitrary data to be stored alongside the job. Supported by TestingBot and Sauce Labs.
 *
 * @property {string=} name
 * A descriptive name for the job. Supported by TestingBot and Sauce Labs.
 *
 * @property {string=} status
 * A status message to provide alongside a test. Supported by TestingBot.
 *
 * @property {boolean=} success
 * Whether or not the job should be listed as successful. Supported by BrowserStack, TestingBot, and Sauce Labs.
 *
 * @property {(string[])=} tags
 * An array of tags for the job. Supported by TestingBot and Sauce Labs.
 *
 * @property {string=} visibility
 * The public visibility of test results. May be one of 'public', 'public restricted', 'share', 'team', or 'private'.
 * Supported by Sauce Labs.
 */
