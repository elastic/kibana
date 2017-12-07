import React from 'react';
import PropTypes from 'prop-types';
import { Modal, Button } from 'react-bootstrap';
import { Changes } from './changes';
import goat from './goat.png';
import './update_modal.less';

export const UpdateModal = ({ build, setBuild, changes }) => {
  if (!build) return null;

  return (
    <Modal.Dialog className="canvas__update-model">
      <Modal.Header>
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
      </Modal.Header>

      <Modal.Body>
        <h3>That's right, an update!</h3>
        <p>
          I know what you're thinking: <i>This is a trick</i>. Well it isn't, we update Canvas
          <strong>a lot</strong>, in direct response to your feedback.
        </p>

        <Changes changes={changes} />

        <p>
          Updating Canvas is easy, you can probably do it yourself, or get your good friends in operations to update it for you.
          If you don't have friends in operations, you might have to bribe them.
          Try beer, those operations people are all degenerates. In any case you'll need these steps:
        </p>

        <h5>1. Stop Kibana and remove the old version of Canvas</h5>
        <code>
          ./bin/kibana-plugin remove canvas
        </code>

        <h5>2. Install the new version</h5>
        <code>
          ./bin/kibana-plugin install https://s3.amazonaws.com/download.elasticsearch.org/kibana/canvas/kibana_canvas-0.1.{ build }.zip
        </code>
        <h5>3. Start Kibana and refresh your browser</h5>
        You should be good to go. Good luck!
      </Modal.Body>

      <Modal.Footer>
        <p style={{ flexGrow: 1, textAlign: 'left' }}><small>*Uhg. I'm going to fire our transcriptionist</small></p>
        <Button
          onClick={ () => setBuild(null) }
        >
          Dismiss
        </Button>
      </Modal.Footer>

    </Modal.Dialog>
  );
};

UpdateModal.propTypes = {
  build: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
  ]),
  changes: PropTypes.string,
  setBuild: PropTypes.func,
};
