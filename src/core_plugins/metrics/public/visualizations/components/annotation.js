import React, { Component, PropTypes } from 'react';
import moment from 'moment';
import reactcss from 'reactcss';
class Annotation extends Component {

  constructor(props) {
    super(props);
    this.state = {
      showTooltip: false
    };
    this.handleMouseOut = this.handleMouseOut.bind(this);
    this.handleMouseOver = this.handleMouseOver.bind(this);
  }

  renderTooltip() {
    if (!this.state.showTooltip) return null;
    const [ timestamp, messageSource ] = this.props.series;
    const styles = reactcss({
      default: {
        tooltip: {
          backgroundColor: 'rgba(0,0,0,0.7)',
          color: 'white'
        },
        caret: {
          borderTop: '5px solid rgba(0,0,0,0.7)'
        },
        timestamp: {
          color: 'rgba(255,255,255,0.7)'
        }
      },
      reversed: {
        tooltip: {
          backgroundColor: 'rgba(255,255,255,0.7)',
          color: 'black'
        },
        caret: {
          borderTop: '5px solid rgba(255,255,255,0.7)'
        },
        timestamp: {
          color: 'rgba(0,0,0,0.7)'
        }
      }
    }, this.props);
    const messages = messageSource.map((message, i) => {
      return (
        <div key={`${message}-${i}`}
          className="annotation__message">{ message }</div>
      );
    });
    return (
      <div className="annotation__tooltip">
        <div className="annotation__tooltip-body" style={styles.tooltip}>
          <div className="annotation__timestamp" style={styles.timestamp}>{ moment(timestamp).format('lll') }</div>
          { messages }
        </div>
        <div className="annotation__caret" style={styles.caret}></div>
      </div>
    );
  }

  handleMouseOver() {
    this.setState({ showTooltip: true });
  }

  handleMouseOut() {
    this.setState({ showTooltip: false });
  }

  render() {
    const { color, plot, icon, series } = this.props;
    const offset = plot.pointOffset({ x: series[0], y: 0 });
    const style = { left: offset.left - 6, bottom: 0, top: 5 };
    const tooltip = this.renderTooltip();
    return(
      <div className="annotation" style={style}>
        <div className="annotation__line" style={{ width: 2, backgroundColor: color }}></div>
        <div
          onMouseOver={this.handleMouseOver}
          onMouseOut={this.handleMouseOut}
          className="annotation__icon">
          <i className={`fa ${icon}`} style={{ color }}></i>
          { tooltip }
        </div>
      </div>
    );
  }

}

Annotation.propTypes = {
  series: PropTypes.array,
  icon: PropTypes.string,
  color: PropTypes.string,
  plot: PropTypes.object,
  reversed: PropTypes.bool
};

export default Annotation;
