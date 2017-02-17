import React from 'react';
import _ from 'lodash';
import elementTypes from 'plugins/rework/elements/elements';
import {argumentSet} from 'plugins/rework/state/actions/element';
import ArgumentForm from 'plugins/rework/components/argument_form/argument_form';
import EditorSection from 'plugins/rework/components/editor_section/editor_section';
import './element_editor.less';

export default class extends React.PureComponent {
  constructor(props) {    /* Note props is passed into the constructor in order to be used */
    super(props);
  }

  renderNotSelected() {
    return (
      <div className="rework--editor">
        <h4>Select an element</h4>
        <p>
          Select an element to configure it here. If you don't have any,
          <a onClick={this.props.openDropDown}> <i className="fa fa-plus-circle"></i> add a new element</a></p>
      </div>
    );
  }

  render() {
    const {element} = this.props;

    // element is not selected, render alternate view
    if (!element) return this.renderNotSelected();

    const {id, type} = element;

    const argValues = element.args;
    const args = elementTypes.byName[type].args;

    const formElements = _.map(args, (arg) => {
      const type = arg.type.name;
      const value = argValues[arg.name];
      const { name, displayName } = arg;

      const commit = (value) => {
        this.props.argumentSet(id, name, value);
      };

      return (
        <EditorSection label={displayName.replace('_', ' ')} open={arg.expand} key={name}>
          <div
            data-name={name}
            data-type={type}
            data-element-type={name}>
            <ArgumentForm
              type={type}
              commit={commit}
              value={value}
              help={arg.help}
              options={arg.options}
              context={argValues}
              defaultValue={arg.default}>
              </ArgumentForm>
          </div>
        </EditorSection>
      );
    });

    return (
      <div className="rework--editor" key={element.id}>
          {formElements}
      </div>
    );
  }
};
