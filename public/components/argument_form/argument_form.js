import React from 'react';
import argTypes from 'plugins/rework/arg_types/arg_types';
import _ from 'lodash';

export default React.createClass({
  render() {
    const {type, value, commit, help, options, defaultValue} = this.props;
    const context = this.props.context || {};
    const Form = argTypes.byName[type].form;
    const helpText = help;

    let formValue;
    if (_.isUndefined(value)) {
      if (_.isUndefined(defaultValue)) {
        formValue = argTypes.byName[type].default;
      } else {
        formValue = defaultValue;
      }
    } else {
      formValue = value;
    }

    return (
      <div className="rework--argument-form">
        <Form commit={commit} options={options} value={formValue} context={context}></Form>
        <label dangerouslySetInnerHTML={{__html: helpText}}></label>
      </div>
    );
  }
});
