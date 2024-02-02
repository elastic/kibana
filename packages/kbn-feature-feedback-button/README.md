# @kbn/feature-feedback-button

## Feature Feedback Button

This component is used to collect user feedback related to the infrastructure features. As the feedback button is now used outside of the observability (currently also in ML) it is moved to this package to allow usage in different plugins.

## Usage

Now the package allows several configuration using the props:

- `formUrl`: (string) Specifies the url of the feedback form used
- `formConfig` (optional): gives the possibility tpo customize the parameters used to prefill the form. In case it's not set it will use the default form prefill parameter values for kibana version, kibana environment, sanitized path. One or more of those query params can be change using this prop, they should be used as follows:
```json
    {
        kibanaVersionQueryParam: '{NEW_PARAM_HERE}',
        kibanaDeploymentTypeQueryParam: '{NEW_PARAM_HERE}',
        sanitizedPathQueryParam: 'entry.1234',
    }
```    

- `data-test-subj`: string
- In order to prefill the form those values should be passed (or some of the values based on the form requirements):
  - `kibanaVersion`: (optional) string
  - `isCloudEnv`: (optional) boolean
  - `isServerlessEnv`: (optional) boolean
  - `sanitizedPath`: (optional) string

- `surveyButtonText`: (optional) If the default button text needs to be changed this property can be set, example value:
```javascript
        <FormattedMessage
            id="xpack.myPlugin.myPage.myFeedbackButtonText"
            defaultMessage="Tell us what you think! (K8s)"
        />
```

Example usage: 
```javascript
import { FeatureFeedbackButton } from '@kbn/feature-feedback-button';

// .....

      <FeatureFeedbackButton
        formUrl="'https://...'"
        formConfig={{
          kibanaVersionQueryParam: 'entry.12345',
        }}
        data-test-subj="my-feature-feedback-link"
        kibanaVersion={8.13}
        isCloudEnv={true}
        isServerlessEnv={false}
        surveyButtonText={
          <FormattedMessage
            id="xpack.myPlugin.myFeature.tellUsWhatYouThinkK8sLink"
            defaultMessage="Tell us what you think! (K8s)"
          />
        }
      />
```