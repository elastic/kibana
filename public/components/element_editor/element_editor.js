import React from 'react';
import { connect } from 'react-redux';
import _ from 'lodash';
import elementTypes from 'plugins/rework/elements/elements';
import {argumentSet} from 'plugins/rework/state/actions/element';
import ArgumentForm from 'plugins/rework/components/argument_form/argument_form';
import './element_editor.less';

export default class extends React.PureComponent {
  constructor(props) {    /* Note props is passed into the constructor in order to be used */
    super(props);
  }

  render() {
    const {element} = this.props;

    if (!element) {
      return (
        <div className="rework--editor">
          <h4>Select an element</h4>
          <p>
            Select an element to configure it here. If you don't have any,
            <a onClick={this.props.openDropDown}> <i className="fa fa-plus-circle"></i> add a new element</a></p>
        </div>
      );
    }

    const {id, type} = element;

    const argValues = element.args;
    const args = elementTypes.byName[type].args;

    return (
      <div className="rework--editor" key={element.id}>
          {_.map(args, (arg) => {
            const type = arg.type.name;
            const value = argValues[arg.name];
            const {name, displayName} = arg;

            const commit = (value) => {
              this.props.argumentSet(id, name, value);
            };

            return (
              <div key={name} className="rework--editor-section" data-element-type={name}>
                <h4>{displayName.replace('_', ' ')}</h4>
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
            );
          })}
      </div>
    );
  }
};
