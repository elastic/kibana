import React, {
  Component,
} from 'react';
import PropTypes from 'prop-types';

import {
  KuiComboBox,
  KuiComboBoxOption,
  KuiComboBoxOptions,
  KuiComboBoxSection,
  KuiComboBoxText,
  KuiComboBoxTitle,
} from 'ui_framework/components';

export class IndexPatternComboBox extends Component {
  constructor() {
    super();

    this.hasInput = this.hasInput.bind(this);
    this.hasNoSimilarMatches = this.hasNoSimilarMatches.bind(this);
    this.hasPartialMatches = this.hasPartialMatches.bind(this);
    this.hasExactMatches = this.hasExactMatches.bind(this);
    this.onInputChange = this.onInputChange.bind(this);
    this.onOptionClick = this.onOptionClick.bind(this);
    this.renderOption = this.renderOption.bind(this);
    this.renderNoMatches = this.renderNoMatches.bind(this);
    this.renderPartialMatches = this.renderPartialMatches.bind(this);
    this.renderExactMatches = this.renderExactMatches.bind(this);
  }

  hasInput() {
    return Boolean(this.props.indexPattern);
  }

  hasNoSimilarMatches() {
    return (
      !this.props.matchingIndices.length
      && !this.props.matchingTemplateIndexPatterns.length
      && !this.props.partialMatchingIndices.length
      && !this.props.partialMatchingTemplateIndexPatterns.length
    );
  }

  hasPartialMatches() {
    if (!this.props.matchingIndices.length && !this.props.matchingTemplateIndexPatterns.length) {
      return (
        this.props.partialMatchingIndices.length
        || this.props.partialMatchingTemplateIndexPatterns.length
      );
    }

    return false;
  }

  hasExactMatches() {
    return Boolean(this.props.matchingIndices.length);
  }

  onInputChange(e) {
    this.props.setIndexPattern(e.target.value);
  }

  onOptionClick(option) {
    this.props.setIndexPattern(option);
  }

  renderOption(index) {
    return (
      <KuiComboBoxOption
        key={index}
        onClick={() => this.props.setIndexPattern(index)}
      >
        {index}
      </KuiComboBoxOption>
    );
  }

  renderNoMatches() {
    let noMatchesIntro;

    if (this.hasInput()) {
      noMatchesIntro = (
        <span>Sorry, there are no indices or template index
        patterns which match or look similar to this index pattern.</span>
      );
    }

    const allIndices = this.props.allIndices.map(this.renderOption);
    const allTemplateIndexPatterns = this.props.allTemplateIndexPatterns.map(this.renderOption);

    return [(
      <KuiComboBoxSection key={0}>
        <KuiComboBoxText>
          {noMatchesIntro} These are all of the indices and template index patterns
          that are available to you.
        </KuiComboBoxText>
      </KuiComboBoxSection>
    ), (
      <KuiComboBoxSection key={1}>
        <KuiComboBoxTitle>
          All indices ({this.props.allIndices.length})
        </KuiComboBoxTitle>

        <KuiComboBoxOptions>
          {allIndices}
        </KuiComboBoxOptions>
      </KuiComboBoxSection>
    ), (
      <KuiComboBoxSection key={2}>
        <KuiComboBoxTitle>
          All template index patterns ({this.props.allTemplateIndexPatterns.length})
        </KuiComboBoxTitle>

        <KuiComboBoxOptions>
          {allTemplateIndexPatterns}
        </KuiComboBoxOptions>
      </KuiComboBoxSection>
    )];
  }

  renderPartialMatches() {
    const partialMatchingIndices = this.props.partialMatchingIndices.map(this.renderOption);
    const partialMatchingTemplateIndexPatterns = this.props.partialMatchingTemplateIndexPatterns.map(this.renderOption);

    return [(
      <KuiComboBoxSection key={0}>
        <KuiComboBoxText>
          No indices match this pattern but there
          are <strong>{this.props.partialMatchingIndices.length}</strong> indices
          and <strong>{this.props.partialMatchingTemplateIndexPatterns.length}</strong> template index patterns
          with similar names.
        </KuiComboBoxText>
      </KuiComboBoxSection>
    ), (
      <KuiComboBoxSection key={1}>
        <KuiComboBoxTitle>
          Similar indices ({this.props.partialMatchingIndices.length})
        </KuiComboBoxTitle>

        <KuiComboBoxOptions>
          {partialMatchingIndices}
        </KuiComboBoxOptions>
      </KuiComboBoxSection>
    ), (
      <KuiComboBoxSection key={2}>
        <KuiComboBoxTitle>
          Similar template index patterns ({this.props.partialMatchingTemplateIndexPatterns.length})
        </KuiComboBoxTitle>

        <KuiComboBoxOptions>
          {partialMatchingTemplateIndexPatterns}
        </KuiComboBoxOptions>
      </KuiComboBoxSection>
    )];
  }

  renderExactMatches() {
    const matchingIndices = this.props.matchingIndices.map(this.renderOption);

    return [(
      <KuiComboBoxSection key={0}>
        <KuiComboBoxText>
          <strong>{this.props.partialMatchingIndices.length}</strong> indices match this pattern.
        </KuiComboBoxText>
      </KuiComboBoxSection>
    ), (
      <KuiComboBoxSection key={1}>
        <KuiComboBoxTitle>
          Matching indices ({this.props.partialMatchingIndices.length})
        </KuiComboBoxTitle>

        <KuiComboBoxOptions>
          {matchingIndices}
        </KuiComboBoxOptions>
      </KuiComboBoxSection>
    )];
  }

  render() {
    let matches;

    if (!this.hasInput()) {
      matches = this.renderNoMatches();
    } else if (this.hasExactMatches()) {
      matches = this.renderExactMatches();
    } else if (this.hasPartialMatches()) {
      matches = this.renderPartialMatches();
    } else {
      matches = this.renderNoMatches();
    }

    return (
      <KuiComboBox
        value={this.props.indexPattern}
        onChange={this.onInputChange}
        size="large"
      >
        {matches}
      </KuiComboBox>
    );
  }
}

IndexPatternComboBox.propTypes = {
  indexPattern: PropTypes.string,
  setIndexPattern: PropTypes.func,
  matchingIndices: PropTypes.array,
  matchingTemplateIndexPatterns: PropTypes.array,
  partialMatchingIndices: PropTypes.array,
  partialMatchingTemplateIndexPatterns: PropTypes.array,
  allIndices: PropTypes.array,
  allTemplateIndexPatterns: PropTypes.array,
};
