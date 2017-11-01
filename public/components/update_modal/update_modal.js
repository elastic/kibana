import React from 'react';
import PropTypes from 'prop-types';
import {
  KuiModalOverlay,
  KuiModal,
  KuiModalBody,
  KuiModalBodyText,
  KuiModalFooter,
  KuiModalHeader,
} from 'ui_framework/components';
import goat from './goat.png';
import './update_modal.less';

import { Button } from 'react-bootstrap';

export const UpdateModal = ({ build }) => {
  if (!build) return null;
  return (
    <KuiModalOverlay>
      <KuiModal style={{ 'width': '700px' }}>
        <KuiModalHeader>
          <div className="canvas__update-model--header">
            <div className="canvas__update-model--goat">
              <img src={goat}/>
            </div>
            <h1 className="canvas__update-model--goat_news">
              <strike>
                <span>Goat</span>
              </strike> Good News!*<br/>
              <small style={{ fontWeight: 100 }}>There's an update available</small>
            </h1>
          </div>
        </KuiModalHeader>

        <KuiModalBody>
          <KuiModalBodyText>
            <h3>That's right, an update!</h3>
            <p>
              I know what you're thinking: <i>This is a trick</i>. Well it isn't, not everything is some conspiracy against you.
              We update Canvas <strong>a lot</strong>, and in direct response to your feedback. Chances are this update is
              a result of something you, or someone in your preview group told us you needed.
            </p>

            <h3>How to update</h3>
            <p>
              Updating Canvas is easy, you can probably do it yourself, or get your good friend in operations to update it for you.
              If you don't have friends in operations, you might have to bribe them.
              Try beer, those operations people are all degenerates. In any case you'll need this command:
            </p>
            <p>
              <code>
                ./bin/kibana-plugin install https://s3.amazonaws.com/download.elasticsearch.org/kibana/canvas/kibana_canvas-0.1.{ build }.zip
              </code>
            </p>

            <p> Go ahead and do that, restart Kibana, and refresh your browser. You should be all set! </p>

          </KuiModalBodyText>
        </KuiModalBody>

        <KuiModalFooter>
          <p style={{ flexGrow: 1 }}><small>*Uhg. I'm going to fire our transcriptionist</small></p>
          <Button
            onClick={ () => {} }
          >
            Dismiss
          </Button>
        </KuiModalFooter>
      </KuiModal>
    </KuiModalOverlay>
  );
};

UpdateModal.propTypes = {
  build: PropTypes.any,
};
