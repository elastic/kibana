import React from 'react';
import argTypes from 'plugins/rework/arg_types/arg_types';

export default React.createClass({
  render() {
    const {type, value, commit, help} = this.props;
    const Form = argTypes.byName[type].form;
    const helpText = help;

    return (
      <div className="rework--argument-form">
        <Form commit={commit} value={value}></Form>
        <small>{helpText}</small>
      </div>
    );
  }
});
