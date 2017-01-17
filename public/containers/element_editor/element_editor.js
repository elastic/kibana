import React from 'react';
import { connect } from 'react-redux';
import _ from 'lodash';
import elementTypes from 'plugins/rework/elements/elements';
import {argumentSet} from 'plugins/rework/state/actions/element';
import ArgumentForm from 'plugins/rework/components/argument_form/argument_form';
import './editor.less';

const Editor = React.createClass({
  render() {
    const {element, dispatch} = this.props;

    if (!element) {
      return (
        <div className="rework--editor">
          <h4><i className="fa fa-info-circle"></i> Select an element</h4>
          <p>Select an element to configure it here. If you don't have any elements <a>Add one</a></p>
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
            const name = arg.name;
            const commit = (value) => {
              dispatch(argumentSet(id, name, value));
            };
            return (
              <div key={name} className="rework--editor-section">
                <h4>{name}</h4>
                <ArgumentForm type={type} commit={commit} value={value}></ArgumentForm>
              </div>
            );
          })}
      </div>
    );
  }
});

export default connect()(Editor);
