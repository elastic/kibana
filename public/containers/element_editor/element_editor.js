import React from 'react';
import { connect } from 'react-redux';
import _ from 'lodash';
import elementTypes from 'plugins/rework/elements/elements';
import {argumentSet} from 'plugins/rework/state/actions/element';
import {dropdownToggle} from 'plugins/rework/state/actions/misc';
import ArgumentForm from 'plugins/rework/components/argument_form/argument_form';
import './element_editor.less';

const Editor = React.createClass({
  elementAdd() {
    this.props.dispatch(dropdownToggle('element'));
  },
  render() {
    const {element, dispatch} = this.props;

    if (!element) {
      return (
        <div className="rework--editor">
          <h4>Select an element</h4>
          <p>
            Select an element to configure it here. If you don't have any,
            <a onClick={this.elementAdd}> <i className="fa fa-plus-circle"></i> add a new element</a></p>
        </div>
      );
    }

    const {id, type} = element;

    const argValues = element.args;
    const args = elementTypes.byName[type].args;

    return (
      <div className="rework--editor">
          {_.map(args, (arg) => {
            const type = arg.type.name;
            const value = argValues[arg.name];
            const {name, displayName} = arg;
            const commit = (value) => {
              dispatch(argumentSet(id, name, value));
            };
            return (
              <div key={name} className="rework--editor-section">
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
});

export default connect()(Editor);
