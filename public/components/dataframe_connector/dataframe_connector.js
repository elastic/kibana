import React from 'react';
import _ from 'lodash';
import frameSources from 'plugins/rework/arg_types/dataframe/frame_sources/frame_sources';
import './dataframe_connector.less';

export default React.createClass({
  getInitialState() {
    return {name: 'Untitled Dataframe'};
  },
  connect(type) {
    return () => {
      const {name} = this.state;
      this.props.onConnect({
        name, type,
        value:  frameSources.byName[type].defaults
      });
    };
  },
  updateName(e) {
    this.setState(_.assign({}, {name: e.target.value}));
  },
  render() {
    const {name, type} = this.state;

    const options = _.map(frameSources, source => {
      return (
        <tr key={source.name} onClick={this.connect(source.name)} className="rework--dataframe-connector-source">
          <td className="rework--dataframe-connector-source-name">{source.displayName}</td>
          <td className="rework--dataframe-connector-source-help">{source.help}</td>
        </tr>
      );
    });

    return (
      <div>
        <div className="form-group">
          <label>Name</label>
          <input className="form-control" type="text" value={name} onChange={this.updateName}></input>
        </div>
        <div className="form-group">
          <label>Connect to</label>
          <div className="rework--dataframe-connector">
            <table className="table">
              <tbody>{options}</tbody>
            </table>
          </div>
        </div>


      </div>
    );
  }
});
