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
    const reversed = this.props.reversed ? '-reversed' : '';
    const messages = messageSource.map((message, i) => {
      return (
        <div key={`${message}-${i}`}
          className="annotation__message">{ message }</div>
      );
    });
    return (
      <div className="annotation__tooltip">
        <div className={`annotation__tooltip-body${reversed}`}>
          <div className={`annotation__timestamp${reversed}`}>{ moment(timestamp).format('lll') }</div>
          { messages }
        </div>
        <div className={`annotation__caret${reversed}`}></div>
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
    const tooltip = this.renderTooltip();
    const style = reactcss({
      default: {
        container: {
          left: offset.left - 6,
          bottom: 0,
          top: 5
        },
        line: {
          backgroundColor: color
        },
        icon: { color }
      }
    });
    return(
      <div className="annotation" style={style.container}>
        <div className="annotation__line" style={style.line}></div>
        <div
          onMouseOver={this.handleMouseOver}
          onMouseOut={this.handleMouseOut}
          className="annotation__icon">
          <i className={`fa ${icon}`} style={style.icon}></i>
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
