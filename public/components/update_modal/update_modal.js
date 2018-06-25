import React from 'react';
import PropTypes from 'prop-types';
import {
  EuiButton,
  EuiCode,
  EuiImage,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiOverlayMask,
} from '@elastic/eui';
import { Changes } from './changes';
import goat from './goat.png';

export const UpdateModal = ({ filename, setFilename, changes }) => {
  const closeModal = () => setFilename(null);

  if (!filename) return null;

  return (
    <EuiOverlayMask>
      <EuiModal className="canvas__update-model" onClose={closeModal}>
        <EuiModalHeader className="canvas__update-model--header">
          <EuiImage size="s" url={goat} alt="Confused Goat" />
          <EuiModalHeaderTitle className="canvas__update-model--goat_news">
            <h1>
              <strike>
                <span>Goat</span>
              </strike>
              &nbsp;Good News!*<br />
              <small style={{ fontWeight: 100 }}>There's an update available</small>
            </h1>
          </EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>
          <h3>That's right, an update!</h3>
          <p>
            I know what you're thinking: <em>This is a trick</em>. Well it isn't, we update Canvas
            <strong> a lot</strong>, in direct response to your feedback.
          </p>
          <Changes changes={changes} />
          <p>
            Updating Canvas is easy, you can probably do it yourself, or get your good friends in
            operations to update it for you. If you don't have friends in operations, you might have
            to bribe them. Try beer, those operations people are all degenerates. In any case you'll
            need these steps:
          </p>
          <h5>1. Stop Kibana and remove the old version of Canvas</h5>
          <EuiCode>./bin/kibana-plugin remove canvas</EuiCode>
          <h5>2. Install the new version</h5>
          <EuiCode>
            NODE_OPTIONS="--max-old-space-size=4096" ./bin/kibana-plugin install
            https://download.elastic.co/kibana/canvas/{filename}
          </EuiCode>
          <h5>3. Start Kibana and refresh your browser</h5>
          You should be good to go. Good luck!
        </EuiModalBody>

        <EuiModalFooter>
          <p style={{ flexGrow: 1, textAlign: 'left' }}>
            <small>*Uhg. I'm going to fire our transcriptionist</small>
          </p>
          <EuiButton onClick={closeModal}>Dismiss</EuiButton>
        </EuiModalFooter>
      </EuiModal>
    </EuiOverlayMask>
  );
};

UpdateModal.propTypes = {
  filename: PropTypes.string,
  changes: PropTypes.string,
  setFilename: PropTypes.func,
};
