import React from 'react';
import reactcss from 'reactcss';
import _ from 'lodash';

export default React.createClass({
  render() {
    const { error } = this.props;
    const styles = reactcss({
      default: {
        container: {
          display: 'flex',
          flexDirection: 'column',
          flex: '1 0 auto',
          backgroundColor: '#FFD9D9',
          color: '#C00',
          justifyContent: 'center',
          padding: '20px'
        },
        title: {
          textAlign: 'center',
          fontSize: '18px',
          fontWeight: 'bold'
        },
        additional: {
          marginTop: '10px',
          padding: '0 20px'
        },
        reason: { textAlign: 'center' },
        stack: {
          marginTop: '10px',
          color: '#FFF',
          border: '10px solid #FFF',
          backgroundColor: '#000',
          fontFamily: '"Courier New", Courier, monospace',
          whiteSpace: 'pre',
          padding: '10px'
        }
      }
    });
    let additionalInfo;
    const type = _.get(error, 'error.caused_by.type');

    if (type === 'script_exception') {
      const scriptStack = _.get(error, 'error.caused_by.script_stack');
      const reason = _.get(error, 'error.caused_by.caused_by.reason');
      additionalInfo = (
        <div style={styles.additional}>
          <div style={styles.reason}>{ reason }</div>
          <div style={styles.stack}>{ scriptStack.join('\n')}</div>
        </div>
      );
    } else {
      const reason = _.get(error, 'error.caused_by.reason');
      additionalInfo = (
        <div style={styles.additional}>
          <div style={styles.reason}>{ reason }</div>
        </div>
      );
    }

    return (
      <div style={styles.container}>
        <div style={styles.title}>The request for this panel failed.</div>
        { additionalInfo }
      </div>
    );
  }
});
