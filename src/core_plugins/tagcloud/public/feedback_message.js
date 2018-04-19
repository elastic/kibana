import React, { Component } from 'react';

export class FeedbackMessage extends Component {

  constructor() {
    super();
    this.state = { shouldShowTruncate: false, shouldShowIncomplete: false };
  }

  render() {
    return (
      <div className="tagcloud-notifications" >
        <div className="tagcloud-truncated-message" style={{ display: this.state.shouldShowTruncate ? 'block' : 'none' }}>
          The number of tags has been truncated to avoid long draw times.
        </div>
        <div className="tagcloud-incomplete-message" style={{ display: this.state.shouldShowIncomplete ? 'block' : 'none' }}>
          The container is too small to display the entire cloud. Tags might be cropped or omitted.
        </div>
      </div>
    );
  }
}
