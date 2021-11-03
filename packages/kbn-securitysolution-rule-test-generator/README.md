## Detections rule test generator

This is a rule test generator that can be integrated and run from the command line.

Example run where ${PROJECT_HOME} is your folder you have `kibana` cloned:

```
cd ${PROJECT_HOME}/kibana
yarn kbn bootstrap
cd x-pack/plugins/security_solution
node scripts/detection_engine/generate_rule_tests
```

