import React from 'react';

import { EuiFieldText, EuiButton } from '@elastic/eui'

import Repo from './Repo';

class ReposManagement extends React.Component {
  state = {
    repos: [],
    importRepoField: ''
  };

  componentDidMount() {
    this.fetchRepos();
  }

  fetchRepos = () => {
    this.props.httpClient.get('../api/castro/repos').then(res => {
      this.setState({ repos: res.data });
    });
  }

  deleteRepoFromState = (repo) => {
    this.setState(prevState => ({
      repos: prevState.repos.filter(r => r.url !== repo.url)
    }));
  }

  handleImportRepoFieldChange = (e) => {
    this.setState({ importRepoField: e.target.value });
  }

  importRepo = () => {
    this.state.importRepoField && this.props.httpClient.post('../api/castro/repo', { url: this.state.importRepoField }).then(this.fetchRepos);
  }

  render() {
    return <div>
      <div>
      <EuiFieldText
        placeholder="input repo url here"
        value={this.state.importRepoField}
        onChange={this.handleImportRepoFieldChange}
      /><EuiButton onClick={this.importRepo}>import</EuiButton></div>
      {this.state.repos.map(repo =>
        <Repo
          key={repo.uri}
          repo={repo}
          httpClient={this.props.httpClient}
          deleteRepoSuccessCallBack={this.deleteRepoFromState}
        />
      )}
    </div>
  }
}

export default ReposManagement;
