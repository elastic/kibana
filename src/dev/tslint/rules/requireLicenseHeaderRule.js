const Lint = require('tslint');

const FAILURE_STRING = 'File must start with a license header';
const RULE_NAME = 'require-license-header';

exports.Rule = class extends Lint.Rules.AbstractRule {
  apply(sourceFile) {
    const [headerText] = this.getOptions().ruleArguments;

    if (!headerText) {
      throw new Error(`${RULE_NAME} requires a single argument containing the header text`);
    }

    if (sourceFile.text.startsWith(headerText)) {
      return [];
    }

    return [
      new Lint.RuleFailure(
        sourceFile,
        0,
        0,
        FAILURE_STRING,
        RULE_NAME,
        new Lint.Replacement(0, 0, `${headerText}\n\n`)
      )
    ];
  }
};
