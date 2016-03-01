import React, { Component, PropTypes } from 'react';
import uiModules from 'ui/modules';
import angular from 'angular';
import ReactDOM from 'react-dom';

import DocTableHeader from './doc_table_header';
import DocTableHit from './doc_table_hit';
import DocTableInfiniteScroll from './doc_table_infinite_scroll';

uiModules
.get('kibana')
.factory('DocTableReactBridge', function ($injector) {
  return class DocTableReactBridge extends Component {
    static propTypes = {
      hits: PropTypes.arrayOf(PropTypes.shape({
        _source: PropTypes.object({})
      })),
      limit: PropTypes.number,
      searchSource: PropTypes.object,
    };

    static childContextTypes = {
      $scope: PropTypes.object,
      $injector: PropTypes.object.isRequired
    };

    constructor(props) {
      super(props);

      this.state = {};
    }

    getChildContext() {
      return { $scope: this.$scope, $injector };
    }

    getContainerClass() {
      const { searchSource = {} } = this.props;
      const loading = searchSource.activeFetchCount > 0;
      return loading ? 'loading' : null;
    }

    componentDidMount() {
      this.$scope = angular.element(ReactDOM.findDOMNode(this)).scope();
    }

    render() {
      const { hits, limit } = this.props;

      if (hits && !hits.length) {
        return (
          <div className="table-vis-error">
          <h2><i className="fa fa-meh-o"></i></h2>
          <h4>No results found</h4>
          </div>
        );
      }

      return (
        <div className={this.getContainerClass()}>
          <table className="kbn-table table">
            <DocTableHeader {...this.props} />
            {
              hits && hits
              .slice(0, limit || hits.lenth)
              .map(hit => (
                <DocTableHit key={hit._index + hit._type + hit._id + hit._score} hit={hit} {...this.props} />
              ))
            }
          </table>
          <DocTableInfiniteScroll {...this.props} />
        </div>
      );
    }
  };
})
